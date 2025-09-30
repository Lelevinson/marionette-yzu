import type { ToolSpec } from '../../lib/tool-registry'

async function getAccessibilitySnapshot(params: any) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Extract interactive elements with accessibility info
        const elements: any[] = []
        let index = 0
        
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
          // Skip hidden elements
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return
          }
          
          const htmlEl = el as HTMLElement
          
          // Compute accessible name
          let accessibleName = ''
          if (htmlEl.hasAttribute('aria-label')) {
            accessibleName = htmlEl.getAttribute('aria-label') || ''
          } else if (htmlEl.hasAttribute('aria-labelledby')) {
            const labelId = htmlEl.getAttribute('aria-labelledby')
            const labelEl = labelId ? document.getElementById(labelId) : null
            accessibleName = labelEl?.textContent?.trim() || ''
          } else if (htmlEl instanceof HTMLInputElement || htmlEl instanceof HTMLTextAreaElement) {
            // For inputs, look for associated label
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
          
          // Create unique selector
          const dataAttr = `data-marionette-${index}`
          htmlEl.setAttribute(dataAttr, 'true')
          
          // Truncate long text
          const displayName = accessibleName.length > 80 
            ? accessibleName.substring(0, 77) + '...'
            : accessibleName
          
          elements.push({
            index,
            role,
            name: displayName,
            tagName: htmlEl.tagName.toLowerCase(),
            selector: `[${dataAttr}]`,
            type: htmlEl instanceof HTMLInputElement ? htmlEl.type : null,
            href: htmlEl instanceof HTMLAnchorElement ? htmlEl.href : null,
            disabled: htmlEl.hasAttribute('disabled')
          })
          
          index++
        })
        
        return elements
      }
    })

    const elements = result[0]?.result || []
    
    if (elements.length === 0) {
      return {
        success: true,
        result: 'No interactive elements found on this page.'
      }
    }
    
    // Format as readable text
    let output = `Found ${elements.length} interactive elements:\n\n`
    
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
  name: 'getAccessibilitySnapshot',
  description: 'Gets a list of all interactive elements on the current page with their accessibility information',
  parameters: [],
  examples: [
    'User: "what can I click on this page?" → getAccessibilitySnapshot',
    'User: "show me the buttons" → getAccessibilitySnapshot',
    'User: "list all links" → getAccessibilitySnapshot'
  ]
}

export default getAccessibilitySnapshot
