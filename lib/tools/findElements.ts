import type { ToolSpec } from '../tool-registry'

async function findElements(params: { query: string }) {
  try {
    if (!params.query) {
      return { success: false, error: 'Query string is required' }
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (searchQuery: string) => {
        const query = searchQuery.toLowerCase()
        const elements: any[] = []
        let globalIndex = 0
        
        const interactiveSelectors = [
          'button',
          'a[href]',
          'input',
          'textarea',
          'select',
          '[role="button"]',
          '[role="link"]',
          '[role="textbox"]',
          '[tabindex]:not([tabindex="-1"])',
          '[onclick]'
        ]
        
        const allElements = document.querySelectorAll(interactiveSelectors.join(','))
        
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement
          
          // Skip hidden or non-visible elements
          const style = window.getComputedStyle(htmlEl)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return
          }
          
          // Skip elements with zero size (dummy/hidden elements)
          const rect = htmlEl.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) {
            return
          }
          
          // Skip elements far offscreen (more than 10000px away)
          if (rect.top < -10000 || rect.left < -10000) {
            return
          }
          
          // Compute accessible name
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
          } else {
            accessibleName = htmlEl.textContent?.trim() || ''
          }
          
          // Get role
          let role = htmlEl.getAttribute('role') || ''
          if (!role) {
            const tagName = htmlEl.tagName.toLowerCase()
            if (tagName === 'button') role = 'button'
            else if (tagName === 'a') role = 'link'
            else if (tagName === 'input') {
              const type = (htmlEl as HTMLInputElement).type
              role = type === 'submit' ? 'button' : 'textbox'
            }
            else if (tagName === 'textarea') role = 'textbox'
            else if (tagName === 'select') role = 'combobox'
          }
          
          // Filter by query - check role, name, tag, type (fuzzy + case insensitive)
          const searchableText = `${role} ${accessibleName} ${htmlEl.tagName}`.toLowerCase()
          
          // Fuzzy matching: split query into words and check if all words appear (in any order)
          const queryWords = query.trim().split(/\s+/)
          const allWordsMatch = queryWords.every(word => searchableText.includes(word))
          
          if (!allWordsMatch) {
            globalIndex++
            return
          }
          
          // Tag element
          const dataAttr = `data-marionette-${globalIndex}`
          htmlEl.setAttribute(dataAttr, 'true')
          
          // Truncate long text
          const displayName = accessibleName.length > 80 
            ? accessibleName.substring(0, 77) + '...'
            : accessibleName
          
          elements.push({
            index: globalIndex,
            role,
            name: displayName,
            tagName: htmlEl.tagName.toLowerCase(),
            selector: `[${dataAttr}]`,
            type: htmlEl instanceof HTMLInputElement ? htmlEl.type : null,
            href: htmlEl instanceof HTMLAnchorElement ? htmlEl.href : null,
            disabled: htmlEl.hasAttribute('disabled')
          })
          
          globalIndex++
        })
        
        return elements
      },
      args: [params.query]
    })

    const elements = result[0]?.result || []
    
    if (elements.length === 0) {
      return {
        success: true,
        result: `No elements found matching "${params.query}".`
      }
    }
    
    // Format as readable text
    let output = `Found ${elements.length} elements matching "${params.query}":\n\n`
    
    elements.forEach((el: any) => {
      const disabled = el.disabled ? ' [DISABLED]' : ''
      const type = el.type ? ` (type: ${el.type})` : ''
      const href = el.href ? ` (${el.href})` : ''
      
      output += `[${el.index}] ${el.role.toUpperCase()}: "${el.name}"${type}${href}${disabled}\n`
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
  description: 'Searches for specific interactive elements on the page by role, name, or text content. More efficient than getAccessibilitySnapshot on complex pages.',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Search query to filter elements (e.g., "search", "submit button", "email input", "login")',
      required: true
    }
  ],
  spokenLine: "Looking for {query}",
  examples: [
    'User: "click the submit button" → findElements with query: "submit"',
    'User: "find the search box" → findElements with query: "search"',
    'When getAccessibilitySnapshot returns too many elements → use findElements to narrow down'
  ]
}

export default findElements
