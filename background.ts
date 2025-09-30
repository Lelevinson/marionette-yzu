import getPageTitle from './background/messages/getPageTitle'
import openTab from './background/messages/openTab'
import captureScreenshot from './background/messages/captureScreenshot'
import getAccessibilitySnapshot from './background/messages/getAccessibilitySnapshot'
import findElements from './background/messages/findElements'
import clickElement from './background/messages/clickElement'
import fillInput from './background/messages/fillInput'
import listenHandler from './background/messages/listen'
import { isValidTool } from './lib/tool-registry'

// Background script for Marionette extension

// Tool handler registry - maps tool names to their implementations
type ToolHandler = (params: any) => Promise<any>

// Wrapper for Plasmo message handlers
const plasmoWrapper = (handler: any): ToolHandler => {
  return async (params: any) => {
    return new Promise((resolve) => {
      handler({ name: '', body: params }, { 
        send: (response: any) => {
          // Convert Plasmo response format to our format
          if (response.error) {
            resolve({ success: false, error: response.error })
          } else {
            resolve({ success: true, ...response })
          }
        }
      })
    })
  }
}

const toolHandlers: Record<string, ToolHandler> = {
  getPageTitle,
  openTab,
  captureScreenshot,
  getAccessibilitySnapshot,
  findElements,
  clickElement,
  fillInput,
  listen: plasmoWrapper(listenHandler)
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Marionette extension installed')
})

// Popup opens automatically on click, no handler needed

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

// No side panel behavior needed for popup
