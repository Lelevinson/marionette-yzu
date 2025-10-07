// scrollDown tool - Scroll the current page down
import type { ToolSpec } from '../tool-registry'

async function scrollDown(params: any) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    // Execute scroll in content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const SCROLL_DELTA = 500
        window.scrollBy({
          top: SCROLL_DELTA,
          behavior: 'smooth'
        })
      }
    })

    return {
      success: true,
      result: 'Scrolled down'
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'scrollDown',
  description: 'Scrolls the current page down by a fixed amount',
  parameters: [],
  examples: [
    'User: "scroll down" → scrollDown',
    'User: "go down" → scrollDown',
    'User: "move down on the page" → scrollDown'
  ],
  spokenLine: 'Scrolling down'
}

export default scrollDown
