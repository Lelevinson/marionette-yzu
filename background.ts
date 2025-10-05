import think from './background/messages/think'
import getPageTitle from './background/messages/getPageTitle'
import openTab from './background/messages/openTab'
import captureScreenshot from './background/messages/captureScreenshot'
import getAccessibilitySnapshot from './background/messages/getAccessibilitySnapshot'
import findElements from './background/messages/findElements'
import clickElement from './background/messages/clickElement'
import fillInput from './background/messages/fillInput'
import listenHandler from './background/messages/listen'
import storeMemory from './background/messages/storeMemory'
import getMemories from './background/messages/getMemories'
import scrollUp from './background/messages/scrollUp'
import scrollDown from './background/messages/scrollDown'
import highlightSelector from './background/messages/highlightSelector'
import highlightText from './background/messages/highlightText'
import captureCurrentPage from './background/messages/captureCurrentPage'
import searchVault from './background/messages/searchVault'
import getVaultStats from './background/messages/getVaultStats'
import getPlaybook from './background/messages/getPlaybook'
import { isValidTool } from './lib/tool-registry'
import { autoCapturePage } from './lib/auto-capture'

// Background script for Marionette extension

// Tool handler registry - maps tool names to their implementations
type ToolHandler = (params: any, context?: string) => Promise<any>

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
  think,
  getPageTitle,
  openTab,
  captureScreenshot,
  getAccessibilitySnapshot,
  findElements,
  clickElement,
  fillInput,
  listen: plasmoWrapper(listenHandler),
  storeMemory,
  getMemories,
  scrollUp,
  scrollDown,
  highlightSelector,
  highlightText,
  captureCurrentPage,
  searchVault,
  getVaultStats,
  getPlaybook
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Marionette extension installed')
})

// Auto-capture pages after they load
chrome.webNavigation.onCompleted.addListener((details) => {
  // Only capture main frame (not iframes)
  if (details.frameId !== 0) {
    return
  }
  
  // Wait 3 seconds for page to settle before capturing
  setTimeout(() => {
    autoCapturePage(details.tabId, details.url).catch(error => {
      console.error('[Background] Auto-capture failed:', error)
    })
  }, 3000)
})

// Popup opens automatically on click, no handler needed

// Handle tool execution messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'run_tool') {
    const { toolName, parameters, context } = message.payload
    
    // Validate tool exists in registry
    if (!isValidTool(toolName)) {
      sendResponse({ success: false, error: `Unknown tool: ${toolName}` })
      return true
    }
    
    // Execute tool handler
    const handler = toolHandlers[toolName]
    if (handler) {
      handler(parameters, context).then(sendResponse).catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    } else {
      sendResponse({ success: false, error: `Tool ${toolName} not implemented` })
    }
    
    return true // Keep message channel open for async response
  }
})

// No side panel behavior needed for popup
