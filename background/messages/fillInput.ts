import type { ToolSpec } from '../../lib/tool-registry'

async function fillInput(params: { index: number, value: string }) {
  try {
    if (params.index === undefined || params.index === null) {
      return { success: false, error: 'Element index is required' }
    }
    
    if (!params.value && params.value !== '') {
      return { success: false, error: 'Value is required' }
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (index: number, value: string) => {
        const element = document.querySelector(`[data-marionette-${index}]`)
        
        if (!element) {
          return { success: false, error: `Element with index ${index} not found. Run getAccessibilitySnapshot first.` }
        }
        
        // Check if it's an input or textarea
        if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) {
          return { success: false, error: 'Element is not an input or textarea' }
        }
        
        // Check if element is disabled or readonly
        if (element.hasAttribute('disabled')) {
          return { success: false, error: 'Element is disabled' }
        }
        
        if (element.hasAttribute('readonly')) {
          return { success: false, error: 'Element is readonly' }
        }
        
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Focus the element
        element.focus()
        
        // Set the value
        element.value = value
        
        // Dispatch input and change events to trigger any listeners
        element.dispatchEvent(new Event('input', { bubbles: true }))
        element.dispatchEvent(new Event('change', { bubbles: true }))
        
        // Get element info for confirmation
        const name = element.getAttribute('aria-label') || 
                     element.labels?.[0]?.textContent?.trim() || 
                     element.placeholder || 
                     'input field'
        
        return { 
          success: true, 
          message: `Filled "${name.substring(0, 50)}" with "${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"` 
        }
      },
      args: [params.index, params.value]
    })

    const response = result[0]?.result
    
    if (response?.success === false) {
      return { success: false, error: response.error }
    }
    
    return { 
      success: true, 
      result: response?.message || `Filled element ${params.index}`
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'fillInput',
  description: 'Fills a text input or textarea on the page with a value',
  parameters: [
    {
      name: 'index',
      type: 'number',
      description: 'The index of the input element (from getAccessibilitySnapshot)',
      required: true
    },
    {
      name: 'value',
      type: 'string',
      description: 'The text value to fill into the input',
      required: true
    }
  ],
  spokenLine: "Entering {value}",
  examples: [
    'User: "fill the email field with test@example.com" → First getAccessibilitySnapshot to find email input, then fillInput with its index and value',
    'After seeing "[3] TEXTBOX: Email" → fillInput with index: 3, value: "test@example.com"'
  ]
}

export default fillInput
