import getPageTitle from './background/messages/getPageTitle'
import openTab from './background/messages/openTab'
import captureScreenshot from './background/messages/captureScreenshot'
import getAccessibilitySnapshot from './background/messages/getAccessibilitySnapshot'
import clickElement from './background/messages/clickElement'
import fillInput from './background/messages/fillInput'
import { isValidTool } from './lib/tool-registry'

// Background script for Marionette extension

// Tool handler registry - maps tool names to their implementations
type ToolHandler = (params: any) => Promise<any>

const toolHandlers: Record<string, ToolHandler> = {
  getPageTitle,
  openTab,
  captureScreenshot,
  getAccessibilitySnapshot,
  clickElement,
  fillInput
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Marionette extension installed')
})

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, opening side panel')
  
  try {
    // Open the side panel
    await chrome.sidePanel.open({ tabId: tab.id })
    console.log('Side panel opened successfully')
  } catch (error) {
    console.error('Failed to open side panel:', error)
  }
})

// Handle tool execution messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'run_tool') {
    const { toolName, parameters } = message.payload
    
    // Validate tool exists in registry
    if (!isValidTool(toolName)) {
      sendResponse({ success: false, error: `Unknown tool: ${toolName}` })
      return true
    }
    
    // Execute tool handler
    const handler = toolHandlers[toolName]
    if (handler) {
      handler(parameters).then(sendResponse).catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    } else {
      sendResponse({ success: false, error: `Tool ${toolName} not implemented` })
    }
    
    return true // Keep message channel open for async response
  }
})

// Set the side panel behavior
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
