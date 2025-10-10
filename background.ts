import think from './lib/tools/think'
import getPageTitle from './lib/tools/getPageTitle'
import openTab from './lib/tools/openTab'
import captureScreenshot from './lib/tools/captureScreenshot'
import getAccessibilitySnapshot from './lib/tools/getAccessibilitySnapshot'
import findElements from './lib/tools/findElements'
import clickElement from './lib/tools/clickElement'
import fillInput from './lib/tools/fillInput'
import listenHandler from './lib/tools/listen'
import storeMemory from './lib/tools/storeMemory'
import getMemories from './lib/tools/getMemories'
import scrollUp from './lib/tools/scrollUp'
import scrollDown from './lib/tools/scrollDown'
import pressKey from './lib/tools/pressKey'
import highlightSelector from './lib/tools/highlightSelector'
import highlightText from './lib/tools/highlightText'
import captureCurrentPage from './lib/tools/captureCurrentPage'
import searchVault from './lib/tools/searchVault'
import getVaultStats from './lib/tools/getVaultStats'
import getPlaybook from './lib/tools/getPlaybook'
import summarizePageHandler from './lib/tools/summarizePage'
import getTabs from './lib/tools/getTabs'
import switchTab from './lib/tools/switchTab'
import { isValidTool, findSimilarTools } from './lib/tool-registry'
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
  pressKey,
  highlightSelector,
  highlightText,
  captureCurrentPage,
  searchVault,
  getVaultStats,
  getPlaybook,
  summarizePage: plasmoWrapper(summarizePageHandler),
  getTabs,
  switchTab
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
      const similarTools = findSimilarTools(toolName)
      let errorMessage = `Unknown tool: ${toolName}`
      
      if (similarTools.length > 0) {
        errorMessage += `\n\nDid you mean one of these?\n- ${similarTools.join('\n- ')}`
        errorMessage += '\n\nIMPORTANT: If you tried to use a playbook name as a tool, remember that playbooks are NOT tools. You must first call getPlaybook("playbook-name") to retrieve the instructions, then follow those instructions using actual tools.'
      }
      
      sendResponse({ success: false, error: errorMessage })
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
