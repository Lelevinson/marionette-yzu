import type { ToolSpec } from '../../lib/tool-registry'

async function captureScreenshot(params: any) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
    
    return { 
      success: true, 
      result: dataUrl,
      isImage: true
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'captureScreenshot',
  description: 'Takes a screenshot of the current active browser tab',
  parameters: [],
  examples: [
    'User: "what am i seeing" → captureScreenshot',
    'User: "show me the page" → captureScreenshot',
    'User: "is there a login button?" → captureScreenshot'
  ]
}

export default captureScreenshot
