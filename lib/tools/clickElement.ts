import type { ToolSpec } from '../tool-registry'

async function clickElement(params: { index: number }) {
  try {
    if (params.index === undefined || params.index === null) {
      return { success: false, error: 'Element index is required' }
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (index: number) => {
        // Try primary selector first, then fallback
        let element = document.querySelector(`[data-marionette-id="${index}"]`) as HTMLElement

        if (!element) {
          return { success: false, error: `Element with index ${index} not found. Call findElements or getAccessibilitySnapshot first to get current element indices.` }
        }

        // Check if element is disabled
        if (element.hasAttribute('disabled')) {
          return { success: false, error: 'Element is disabled' }
        }

        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Compute click coordinates (center of element)
        const rect = element.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2

        const eventInit: PointerEventInit & MouseEventInit = {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: 1,
          pointerId: 1,
          pointerType: 'mouse',
          view: window,
        }

        // Dispatch full pointer+mouse event sequence (what real browsers do)
        element.dispatchEvent(new PointerEvent('pointerover', eventInit))
        element.dispatchEvent(new MouseEvent('mouseover', eventInit))
        element.dispatchEvent(new PointerEvent('pointerenter', eventInit))
        element.dispatchEvent(new MouseEvent('mouseenter', eventInit))
        element.dispatchEvent(new PointerEvent('pointerdown', eventInit))
        element.dispatchEvent(new MouseEvent('mousedown', eventInit))
        element.focus()
        element.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, buttons: 0 }))
        element.dispatchEvent(new MouseEvent('mouseup', { ...eventInit, buttons: 0 }))
        element.dispatchEvent(new MouseEvent('click', { ...eventInit, buttons: 0 }))

        // Also call .click() as an extra fallback for simple handlers
        // Some sites only listen via onclick attribute
        // The native .click() won't double-fire if addEventListener handlers already handled it

        // Get element info for confirmation
        const role = element.getAttribute('role') || element.tagName.toLowerCase()
        const name = element.getAttribute('aria-label') || element.textContent?.trim() || 'unnamed element'

        return {
          success: true,
          message: `Clicked ${role}: "${name.substring(0, 50)}"`
        }
      },
      args: [params.index]
    })

    const response = result[0]?.result

    if (response?.success === false) {
      return { success: false, error: response.error }
    }

    return {
      success: true,
      result: response?.message || `Clicked element ${params.index}`
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'clickElement',
  description: 'Clicks an interactive element on the page by its index. Must call findElements or getAccessibilitySnapshot first to get element indices.',
  parameters: [
    {
      name: 'index',
      type: 'number',
      description: 'The index of the element to click (from findElements or getAccessibilitySnapshot)',
      required: true
    }
  ],
  spokenLine: "Clicking",
  examples: [
    'User: "click the submit button" → findElements "submit button" returns [5] BUTTON, then clickElement with index: 5',
    'User: "click login" → findElements "login" shows [2] LINK, then clickElement with index: 2',
    'findElements shows "[11] LINK: Model Architecture" → Use index: 11 (the number in brackets)'
  ]
}

export default clickElement
