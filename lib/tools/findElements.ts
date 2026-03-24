import type { ToolSpec } from '../tool-registry'

// Expanded interactive selectors covering modern web patterns
const INTERACTIVE_SELECTORS = [
  // Standard form elements
  'button', 'a[href]', 'input', 'textarea', 'select', 'summary',
  // Content-editable (Gmail, Google Docs, Notion, etc.)
  '[contenteditable="true"]', '[contenteditable=""]',
  // ARIA roles - interactive widgets
  '[role="button"]', '[role="link"]', '[role="textbox"]',
  '[role="searchbox"]', '[role="combobox"]', '[role="listbox"]',
  '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
  '[role="option"]', '[role="tab"]', '[role="switch"]',
  '[role="checkbox"]', '[role="radio"]', '[role="slider"]',
  '[role="spinbutton"]', '[role="treeitem"]',
  // Interactive via attributes
  '[tabindex]:not([tabindex="-1"])',
  '[onclick]', '[onmousedown]', '[onpointerdown]',
]

// Compute accessible name using multiple signals
function computeAccessibleName(el: HTMLElement): string {
  // 1. aria-label (explicit)
  if (el.hasAttribute('aria-label')) {
    return el.getAttribute('aria-label') || ''
  }
  // 2. aria-labelledby (referenced)
  if (el.hasAttribute('aria-labelledby')) {
    const labelId = el.getAttribute('aria-labelledby')
    const labelEl = labelId ? document.getElementById(labelId) : null
    if (labelEl?.textContent?.trim()) {
      return labelEl.textContent.trim()
    }
  }
  // 3. For inputs: associated <label>, then placeholder
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const label = el.labels?.[0]
    if (label?.textContent?.trim()) return label.textContent.trim()
    if (el.placeholder) return el.placeholder
    // 3b. value on submit/reset buttons
    if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'reset' || el.type === 'button')) {
      if (el.value) return el.value
    }
  }
  // 4. alt text (for images inside buttons, or img elements)
  if (el instanceof HTMLImageElement && el.alt) {
    return el.alt
  }
  // Check for img child with alt text (common pattern: <button><img alt="Send"></button>)
  const imgChild = el.querySelector('img[alt]')
  if (imgChild && (imgChild as HTMLImageElement).alt) {
    return (imgChild as HTMLImageElement).alt
  }
  // 5. title attribute
  if (el.title) {
    return el.title
  }
  // 6. textContent (fallback)
  return el.textContent?.trim() || ''
}

// Map tag names to implicit ARIA roles
function getImplicitRole(el: HTMLElement): string {
  const tagName = el.tagName.toLowerCase()
  if (tagName === 'button') return 'button'
  if (tagName === 'a' && el.hasAttribute('href')) return 'link'
  if (tagName === 'input') {
    const type = (el as HTMLInputElement).type
    if (type === 'submit' || type === 'reset' || type === 'button' || type === 'image') return 'button'
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'radio'
    if (type === 'range') return 'slider'
    if (type === 'number') return 'spinbutton'
    if (type === 'search') return 'searchbox'
    return 'textbox'
  }
  if (tagName === 'textarea') return 'textbox'
  if (tagName === 'select') return 'combobox'
  if (tagName === 'summary') return 'button'
  if (el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === '') return 'textbox'
  return 'generic'
}

// Fast deterministic element filtering (replaces MiniLM embedding)
function filterElementsByQuery(elements: any[], query: string): any[] {
  const q = query.toLowerCase()
  const tokens = q.split(/\s+/).filter(t => t.length > 0)

  return elements
    .map(el => {
      let score = 0
      const searchable = `${el.role} ${el.name} ${el.tagName} ${el.type || ''} ${el.placeholder || ''}`.toLowerCase()

      // Exact full-query substring match (strong signal)
      if (searchable.includes(q)) score += 100

      // Token-level matches
      for (const token of tokens) {
        if (searchable.includes(token)) score += 20
      }

      // Role-based boosting when query implies element type
      if (/search/.test(q) && (el.role === 'searchbox' || el.role === 'combobox' || el.type === 'search')) score += 50
      if (/button|submit|click/.test(q) && el.role === 'button') score += 50
      if (/input|field|box|text|type|enter|write|fill/.test(q) && (el.role === 'textbox' || el.role === 'searchbox')) score += 50
      if (/link/.test(q) && el.role === 'link') score += 50
      if (/check/.test(q) && el.role === 'checkbox') score += 50
      if (/select|dropdown|combo/.test(q) && (el.role === 'combobox' || el.role === 'listbox')) score += 50
      if (/tab/.test(q) && el.role === 'tab') score += 50
      if (/menu/.test(q) && el.role?.startsWith('menuitem')) score += 50

      // Penalize empty names
      if (!el.name || el.name.trim().length === 0) score -= 10

      return { ...el, score }
    })
    .filter(el => el.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
}

async function findElements(params: { query: string }) {
  try {
    if (!params.query) {
      return { success: false, error: 'Query string is required' }
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    // Inject the selectors as a serialized constant
    const selectorsJoined = INTERACTIVE_SELECTORS.join(',')

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selectorString: string) => {
        const elements: any[] = []
        let globalIndex = 0

        // CRITICAL: Remove all stale marionette attributes first
        document.querySelectorAll('[data-marionette-id]').forEach(el => {
          el.removeAttribute('data-marionette-id')
        })

        const allElements = document.querySelectorAll(selectorString)

        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement

          // Skip hidden or non-visible elements
          const style = window.getComputedStyle(htmlEl)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return
          }

          // Skip elements with zero size
          const rect = htmlEl.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) {
            return
          }

          // Skip elements far offscreen
          if (rect.top < -10000 || rect.left < -10000) {
            return
          }

          // Compute accessible name using improved algorithm
          let accessibleName = ''
          // aria-label
          if (htmlEl.hasAttribute('aria-label')) {
            accessibleName = htmlEl.getAttribute('aria-label') || ''
          }
          // aria-labelledby
          else if (htmlEl.hasAttribute('aria-labelledby')) {
            const labelId = htmlEl.getAttribute('aria-labelledby')
            const labelEl = labelId ? document.getElementById(labelId) : null
            accessibleName = labelEl?.textContent?.trim() || ''
          }
          // For inputs: label, placeholder, value
          else if (htmlEl instanceof HTMLInputElement || htmlEl instanceof HTMLTextAreaElement) {
            const label = htmlEl.labels?.[0]
            accessibleName = label?.textContent?.trim() || htmlEl.placeholder || ''
            if (!accessibleName && htmlEl instanceof HTMLInputElement &&
                (htmlEl.type === 'submit' || htmlEl.type === 'reset' || htmlEl.type === 'button')) {
              accessibleName = htmlEl.value || ''
            }
          }
          // img alt inside buttons
          else {
            const imgChild = htmlEl.querySelector('img[alt]')
            if (imgChild && (imgChild as HTMLImageElement).alt) {
              accessibleName = (imgChild as HTMLImageElement).alt
            } else {
              accessibleName = htmlEl.title || htmlEl.textContent?.trim() || ''
            }
          }

          // Get role (explicit or implicit)
          let role = htmlEl.getAttribute('role') || ''
          if (!role) {
            const tagName = htmlEl.tagName.toLowerCase()
            if (tagName === 'button') role = 'button'
            else if (tagName === 'a' && htmlEl.hasAttribute('href')) role = 'link'
            else if (tagName === 'input') {
              const type = (htmlEl as HTMLInputElement).type
              if (type === 'submit' || type === 'reset' || type === 'button' || type === 'image') role = 'button'
              else if (type === 'checkbox') role = 'checkbox'
              else if (type === 'radio') role = 'radio'
              else if (type === 'range') role = 'slider'
              else if (type === 'number') role = 'spinbutton'
              else if (type === 'search') role = 'searchbox'
              else role = 'textbox'
            }
            else if (tagName === 'textarea') role = 'textbox'
            else if (tagName === 'select') role = 'combobox'
            else if (tagName === 'summary') role = 'button'
            else if (htmlEl.getAttribute('contenteditable') === 'true' ||
                     htmlEl.getAttribute('contenteditable') === '') role = 'textbox'
            else role = 'generic'
          }

          // Stamp element with stable attribute
          htmlEl.setAttribute('data-marionette-id', String(globalIndex))

          // Truncate long text
          const displayName = accessibleName.length > 80
            ? accessibleName.substring(0, 77) + '...'
            : accessibleName

          // Collect stable identifiers for re-finding
          elements.push({
            index: globalIndex,
            role,
            name: displayName,
            tagName: htmlEl.tagName.toLowerCase(),
            type: htmlEl instanceof HTMLInputElement ? htmlEl.type : null,
            href: htmlEl instanceof HTMLAnchorElement ? htmlEl.href : null,
            disabled: htmlEl.hasAttribute('disabled'),
            // Stable identifiers for fallback re-finding
            id: htmlEl.id || null,
            nameAttr: htmlEl.getAttribute('name') || null,
            placeholder: htmlEl.getAttribute('placeholder') || null,
          })

          globalIndex++
        })

        return elements
      },
      args: [selectorsJoined]
    })

    const elements = result[0]?.result || []

    if (elements.length === 0) {
      return {
        success: true,
        result: `No interactive elements found on this page.`
      }
    }

    // Use fast deterministic filtering
    console.log('[findElements] Using deterministic filtering with query:', params.query)

    // Filter out elements with no meaningful text/name
    const meaningfulElements = elements.filter((el: any) => {
      const hasText = el.name && el.name.trim().length > 0
      const isNotJustSymbol = el.name && (el.name.length > 1 || !/^[×☰≡•]$/.test(el.name))
      return hasText && isNotJustSymbol
    })

    if (meaningfulElements.length === 0) {
      return {
        success: true,
        result: `No elements with text found matching "${params.query}". Try a different query.`
      }
    }

    // Apply deterministic token+role scoring
    const topElements = filterElementsByQuery(meaningfulElements, params.query)

    console.log('[findElements] Filtered to top', topElements.length, 'elements by deterministic scoring')

    if (topElements.length === 0) {
      return {
        success: true,
        result: `No elements found matching "${params.query}".`
      }
    }

    // Format as readable text
    let output = `Found ${elements.length} elements (${meaningfulElements.length} with text), showing top ${topElements.length} matches for "${params.query}":\n\n`

    topElements.forEach((el: any) => {
      const disabled = el.disabled ? ' [DISABLED]' : ''
      const type = el.type ? ` (type: ${el.type})` : ''
      const href = el.href ? ` (${el.href})` : ''
      const scoreStr = ` [score: ${el.score}]`

      output += `[${el.index}] ${el.role.toUpperCase()}: "${el.name}"${type}${href}${disabled}${scoreStr}\n`
    })

    return {
      success: true,
      result: output
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'findElements',
  description: 'Finds UI elements (buttons, inputs, links) on the page using semantic search. Returns top 15 most relevant matches ranked by relevance. Use natural language to describe what you\'re looking for.',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Natural language description of the element you\'re looking for (e.g., "first video", "submit button", "email input", "login link")',
      required: true
    }
  ],
  spokenLine: "Looking for {query}",
  examples: [
    'User: "click the submit button" → findElements with query: "submit button"',
    'User: "click first video" → findElements with query: "video" to find video links',
    'User: "search for AI podcasts" → findElements with query: "search box" (NOT "ai podcasts"), then fillInput with "AI podcasts"',
    'User: "type my email" → findElements with query: "email input"'
  ]
}

export default findElements
