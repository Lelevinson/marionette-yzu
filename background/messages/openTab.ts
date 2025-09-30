import type { ToolSpec } from '../../lib/tool-registry'

async function openTab(params: { url: string }) {
  try {
    if (!params.url) {
      return { success: false, error: 'URL is required' }
    }

    const tab = await chrome.tabs.create({ url: params.url })
    
    return { 
      success: true, 
      result: `Opened ${params.url} in new tab (ID: ${tab.id})` 
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'openTab',
  description: 'Opens a URL in a new browser tab',
  parameters: [
    {
      name: 'url',
      type: 'string',
      description: 'The full URL to open (must include http:// or https://)',
      required: true
    }
  ],
  examples: [
    'User: "open google" → openTab with url: "https://www.google.com"',
    'User: "go to reddit" → openTab with url: "https://www.reddit.com"',
    'User: "navigate to youtube.com" → openTab with url: "https://www.youtube.com"'
  ]
}

export default openTab
