import type { ToolSpec } from '../tool-registry'

// Expanded interactive selectors (same as findElements)
const INTERACTIVE_SELECTORS = [
  'button', 'a[href]', 'input', 'textarea', 'select', 'summary',
  '[contenteditable="true"]', '[contenteditable=""]',
  '[role="button"]', '[role="link"]', '[role="textbox"]',
  '[role="searchbox"]', '[role="combobox"]', '[role="listbox"]',
  '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
  '[role="option"]', '[role="tab"]', '[role="switch"]',
  '[role="checkbox"]', '[role="radio"]', '[role="slider"]',
  '[role="spinbutton"]', '[role="treeitem"]',
  '[tabindex]:not([tabindex="-1"])',
  '[onclick]', '[onmousedown]', '[onpointerdown]',
]

// Fast deterministic element filtering by query
function filterElementsByQuery(elements: any[], query: string): any[] {
  const q = query.toLowerCase()
  const tokens = q.split(/\s+/).filter(t => t.length > 0)

  return elements
    .map(el => {
      let score = 0
      const searchable = `${el.role} ${el.name} ${el.tagName} ${el.type || ''} ${el.placeholder || ''}`.toLowerCase()

      if (searchable.includes(q)) score += 100
      for (const token of tokens) {
        if (searchable.includes(token)) score += 20
      }

      if (/search/.test(q) && (el.role === 'searchbox' || el.role === 'combobox' || el.type === 'search')) score += 50
      if (/button|submit|click/.test(q) && el.role === 'button') score += 50
      if (/input|field|box|text|type|enter|write|fill/.test(q) && (el.role === 'textbox' || el.role === 'searchbox')) score += 50
      if (/link/.test(q) && el.role === 'link') score += 50
      if (/check/.test(q) && el.role === 'checkbox') score += 50
      if (/select|dropdown|combo/.test(q) && (el.role === 'combobox' || el.role === 'listbox')) score += 50
      if (/tab/.test(q) && el.role === 'tab') score += 50
      if (/menu/.test(q) && el.role?.startsWith('menuitem')) score += 50

      if (!el.name || el.name.trim().length === 0) score -= 10

      return { ...el, score }
    })
    .filter(el => el.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
}

// Score elements by importance (for unfiltered display)
function scoreByImportance(elements: any[]): any[] {
  return elements.map((el: any) => {
    let score = 0

    // Prefer buttons and submit buttons
    if (el.role === 'button') score += 10
    if (el.type === 'submit') score += 15

    // Prefer form inputs
    if (el.role === 'textbox' || el.role === 'searchbox') score += 8
    if (el.role === 'combobox') score += 8

    // Prefer links with meaningful text
    if (el.role === 'link' && el.name.length > 3) score += 5

    // Prefer elements with descriptive names
    if (el.name.length > 5) score += 3
    if (el.name.length > 20) score += 2

    // Penalize empty or generic names
    if (!el.name || el.name.length === 0) score -= 5
    if (['×', '☰', '≡', '•'].includes(el.name)) score -= 3

    // Prefer common action words
    const actionWords = ['submit', 'send', 'save', 'login', 'sign', 'search', 'next', 'back', 'cancel', 'delete', 'add', 'create']
    if (actionWords.some(word => el.name.toLowerCase().includes(word))) score += 5

    return { ...el, importanceScore: score }
  })
}

async function getAccessibilitySnapshot(params: any) {
  try {
    const { query } = params

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const selectorsJoined = INTERACTIVE_SELECTORS.join(',')

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selectorString: string) => {
        const elements: any[] = []
        let index = 0

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
          if (htmlEl.hasAttribute('aria-label')) {
            accessibleName = htmlEl.getAttribute('aria-label') || ''
          } else if (htmlEl.hasAttribute('aria-labelledby')) {
            const labelId = htmlEl.getAttribute('aria-labelledby')
            const labelEl = labelId ? document.getElementById(labelId) : null
            accessibleName = labelEl?.textContent?.trim() || ''
          } else if (htmlEl instanceof HTMLInputElement || htmlEl instanceof HTMLTextAreaElement) {
            const label = htmlEl.labels?.[0]
            accessibleName = label?.textContent?.trim() || htmlEl.placeholder || ''
            if (!accessibleName && htmlEl instanceof HTMLInputElement &&
                (htmlEl.type === 'submit' || htmlEl.type === 'reset' || htmlEl.type === 'button')) {
              accessibleName = htmlEl.value || ''
            }
          } else {
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
          htmlEl.setAttribute('data-marionette-id', String(index))

          // Truncate long text
          const displayName = accessibleName.length > 80
            ? accessibleName.substring(0, 77) + '...'
            : accessibleName

          elements.push({
            index,
            role,
            name: displayName,
            tagName: htmlEl.tagName.toLowerCase(),
            type: htmlEl instanceof HTMLInputElement ? htmlEl.type : null,
            href: htmlEl instanceof HTMLAnchorElement ? htmlEl.href : null,
            disabled: htmlEl.hasAttribute('disabled'),
            id: htmlEl.id || null,
            nameAttr: htmlEl.getAttribute('name') || null,
            placeholder: htmlEl.getAttribute('placeholder') || null,
          })

          index++
        })

        return elements
      },
      args: [selectorsJoined]
    })

    const elements = result[0]?.result || []

    if (elements.length === 0) {
      return {
        success: true,
        result: 'No interactive elements found on this page.'
      }
    }

    let filteredElements = elements
    let filterMethod = 'none'

    const MAX_ELEMENTS_TO_SHOW = 50

    // Use deterministic filtering if query is provided
    if (query && typeof query === 'string') {
      console.log('[getAccessibilitySnapshot] Using deterministic filtering with query:', query)
      filteredElements = filterElementsByQuery(elements, query)
      filterMethod = 'query'
      console.log('[getAccessibilitySnapshot] Filtered to', filteredElements.length, 'elements')
    }

    // If still too many elements (no query), use importance-based filtering
    if (filteredElements.length > MAX_ELEMENTS_TO_SHOW) {
      console.log('[getAccessibilitySnapshot] Too many elements, filtering by importance...')
      const scored = scoreByImportance(filteredElements)
      scored.sort((a: any, b: any) => b.importanceScore - a.importanceScore)
      filteredElements = scored.slice(0, MAX_ELEMENTS_TO_SHOW)
      filterMethod = filterMethod === 'query' ? 'query+importance' : 'importance'
      console.log('[getAccessibilitySnapshot] Filtered to', filteredElements.length, 'elements by importance')
    }

    // Format as readable text
    let output = ''
    if (filterMethod.includes('query')) {
      output = `Found ${elements.length} elements, filtered to top ${filteredElements.length} by relevance to "${query}":\n\n`
    } else if (filterMethod === 'importance') {
      output = `Found ${elements.length} elements, showing top ${filteredElements.length} most important:\n\n`
    } else {
      output = `Found ${filteredElements.length} interactive elements:\n\n`
    }

    filteredElements.forEach((el: any) => {
      const disabled = el.disabled ? ' [DISABLED]' : ''
      const type = el.type ? ` (type: ${el.type})` : ''
      const href = el.href ? ` (${el.href})` : ''
      const scoreStr = el.score !== undefined ? ` [score: ${el.score}]` : ''

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
  name: 'getAccessibilitySnapshot',
  description: 'Gets a list of interactive elements on the current page. Automatically filters to top 50 most important elements on complex pages. Use query parameter for filtering.',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Optional: Search query to filter elements (e.g., "submit button", "login form", "email input")',
      required: false
    }
  ],
  spokenLine: "Let me see what's on this page",
  examples: [
    'User: "what can I click on this page?" → getAccessibilitySnapshot',
    'User: "show me the buttons" → getAccessibilitySnapshot',
    'User: "list all links" → getAccessibilitySnapshot',
    'Find specific elements → getAccessibilitySnapshot with query: "submit button"'
  ]
}

export default getAccessibilitySnapshot
