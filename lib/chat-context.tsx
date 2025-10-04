import React, { createContext, useContext, useReducer, type ReactNode } from 'react'
import { type Message, createUserMessage, createAssistantMessage } from './messages'
import { streamResponse, getTokenUsage, destroySession as destroyAISession, interrupt as interruptAI, getSystemPrompt } from './ai'
import { parseToolCall, executeTool, detectInvalidToolFormat } from './tools'
import { shouldSummarize, summarizeConversation, formatSummaryMessage } from './summarizer'
import { executeUITool, validateUITools } from './ui-tools'
import { getToolSpec } from './tool-registry'
import { isAIModelError } from './errors'
import { type AlertAction, openAIFlagsPage } from './alert-context'

// Validate UI tools on module load
validateUITools()

// Global error handler reference - set by AlertProvider
let globalAlertHandler: ((type: 'error' | 'info', title: string, message: string, action?: AlertAction) => void) | null = null

export const setGlobalAlertHandler = (handler: (type: 'error' | 'info', title: string, message: string, action?: AlertAction) => void) => {
  globalAlertHandler = handler
}

interface ChatState {
  messages: Message[]
  isProcessing: boolean
  isWaitingForFirstChunk: boolean
  isSummarizing: boolean
  executingTool: string | null
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'UPDATE_MESSAGE_CONTEXT'; payload: { id: string; contextCount: number } }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_WAITING'; payload: boolean }
  | { type: 'SET_SUMMARIZING'; payload: boolean }
  | { type: 'SET_EXECUTING_TOOL'; payload: string | null }
  | { type: 'RESET' }

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content }
            : msg
        )
      }
    
    case 'UPDATE_MESSAGE_CONTEXT':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, contextCount: action.payload.contextCount }
            : msg
        )
      }
    
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload }
    
    case 'SET_WAITING':
      return { ...state, isWaitingForFirstChunk: action.payload }
    
    case 'SET_SUMMARIZING':
      return { ...state, isSummarizing: action.payload }
    
    case 'SET_EXECUTING_TOOL':
      return { ...state, executingTool: action.payload }
    
    case 'RESET':
      return { messages: [], isProcessing: false, isWaitingForFirstChunk: false, isSummarizing: false, executingTool: null }
    
    default:
      return state
  }
}

interface ChatContextValue {
  state: ChatState
  dispatch: React.Dispatch<ChatAction>
  sendMessage: (userInput: string) => Promise<void>
  resetChat: () => void
  interruptChat: () => void
  copyContext: () => Promise<string>
  isInitialLoadComplete: boolean
}

const ChatContext = createContext<ChatContextValue | null>(null)

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isProcessing: false,
    isWaitingForFirstChunk: false,
    isSummarizing: false,
    executingTool: null
  })

  // Track if we need to rebuild AI context from restored messages
  const [needsContextRebuild, setNeedsContextRebuild] = React.useState(false)
  
  // Track if initial load from storage is complete
  const [isInitialLoadComplete, setIsInitialLoadComplete] = React.useState(false)
  
  // Track if we're currently syncing to avoid loops
  const isSyncingRef = React.useRef(false)

  // Restore messages on mount
  React.useEffect(() => {
    chrome.storage.local.get(['chat_messages'], (result) => {
      if (result.chat_messages && Array.isArray(result.chat_messages) && result.chat_messages.length > 0) {
        console.log('Restored', result.chat_messages.length, 'messages from storage')
        result.chat_messages.forEach((msg: Message) => {
          dispatch({ type: 'ADD_MESSAGE', payload: msg })
        })
        // Mark that we need to rebuild context on next user message
        setNeedsContextRebuild(true)
      }
      // Mark initial load as complete (whether we restored messages or not)
      setIsInitialLoadComplete(true)
    })

    // Listen for storage changes from other instances
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') return
      if (!changes.chat_messages) return
      if (isSyncingRef.current) return

      const newMessages = changes.chat_messages.newValue

      // Handle reset (messages cleared)
      if (!newMessages || (Array.isArray(newMessages) && newMessages.length === 0)) {
        console.log('Syncing reset from another instance')
        dispatch({ type: 'RESET' })
        return
      }

      // Handle message updates
      if (Array.isArray(newMessages)) {
        console.log('Syncing', newMessages.length, 'messages from another instance')
        // Reset and rebuild with new messages
        dispatch({ type: 'RESET' })
        newMessages.forEach((msg: Message) => {
          dispatch({ type: 'ADD_MESSAGE', payload: msg })
        })
        setNeedsContextRebuild(true)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // Save messages to storage whenever they change
  React.useEffect(() => {
    isSyncingRef.current = true
    
    if (state.messages.length > 0) {
      chrome.storage.local.set({ chat_messages: state.messages })
    } else {
      // Clear storage when no messages
      chrome.storage.local.remove(['chat_messages'])
    }
    
    // Reset sync flag after a brief delay to allow storage to update
    setTimeout(() => {
      isSyncingRef.current = false
    }, 100)
  }, [state.messages])

  const checkAndSummarize = async () => {
    const tokenUsage = getTokenUsage()
    
    if (shouldSummarize(tokenUsage.usage)) {
      console.log('Context threshold reached, summarizing conversation...')
      dispatch({ type: 'SET_SUMMARIZING', payload: true })
      
      try {
        // Summarize current conversation
        const summary = await summarizeConversation(state.messages)
        
        // Reset session
        destroyAISession()
        
        // Clear messages and add summary
        dispatch({ type: 'RESET' })
        const summaryMessage = createAssistantMessage(formatSummaryMessage(summary), 0)
        dispatch({ type: 'ADD_MESSAGE', payload: summaryMessage })
        
        console.log('Conversation summarized and reset')
      } catch (error: any) {
        console.error('Summarization failed:', error)
        const errorMsg = createAssistantMessage(`Failed to summarize: ${error.message}`, 0)
        dispatch({ type: 'ADD_MESSAGE', payload: errorMsg })
      } finally {
        dispatch({ type: 'SET_SUMMARIZING', payload: false })
      }
    }
  }

  const sendMessage = async (userInput: string) => {
    // CRITICAL: Check user activation immediately while we have it
    const hasUserActivation = (navigator as any).userActivation?.isActive
    console.log('sendMessage called - User activation at start:', hasUserActivation)
    
    console.log('[PROCESSING] Setting to TRUE')
    dispatch({ type: 'SET_PROCESSING', payload: true })
    dispatch({ type: 'SET_WAITING', payload: true })
    
    // If we restored messages and haven't rebuilt context yet, prepend conversation history BEFORE adding new message
    let messageToSend = userInput
    if (needsContextRebuild && state.messages.length > 0) {
      console.log('Rebuilding AI context from', state.messages.length, 'previous messages')
      const history = state.messages.map(msg => {
        let content = msg.content
        
        // Truncate base64 images
        if (content.includes('data:image/')) {
          content = content.replace(
            /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
            (match) => {
              const preview = match.substring(0, 50)
              return `${preview}... [IMAGE_TRUNCATED_${match.length}_CHARS]`
            }
          )
        }
        
        // Truncate base64 audio
        if (content.includes('data:audio/')) {
          content = content.replace(
            /data:audio\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
            (match) => {
              const preview = match.substring(0, 50)
              return `${preview}... [AUDIO_TRUNCATED_${match.length}_CHARS]`
            }
          )
        }
        
        return `${msg.role.toUpperCase()}: ${content}`
      }).join('\n\n')
      messageToSend = `[Previous conversation history]\n\n${history}\n\n[Current message]\nUSER: ${userInput}`
      setNeedsContextRebuild(false)
    }
    
    // Add user message AFTER building history
    const userMessage = createUserMessage(userInput)
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })
    
    // Stream AI response
    let assistantContent = ""
    let assistantMessageId = Date.now() + '_assistant'
    
    try {
      console.log('[PROCESSING] Starting initial stream...')
      const contextCount = await streamResponse(messageToSend, (chunk: string) => {
        assistantContent += chunk
        
        if (assistantContent.length === chunk.length) {
          // First chunk - add message
          console.log('[PROCESSING] First chunk received')
          dispatch({ type: 'SET_WAITING', payload: false })
          const assistantMessage = createAssistantMessage(assistantContent)
          assistantMessageId = assistantMessage.id
          dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage })
        } else {
          // Update existing message
          dispatch({ type: 'UPDATE_MESSAGE', payload: { id: assistantMessageId, content: assistantContent } })
        }
      })
      
      console.log('[PROCESSING] Initial stream complete, content length:', assistantContent.length)
      
      // Update message with context count
      dispatch({ type: 'UPDATE_MESSAGE_CONTEXT', payload: { id: assistantMessageId, contextCount } })
      
      // Check if summarization is needed before tool loop
      await checkAndSummarize()
      
      // Tool execution loop
      console.log('[PROCESSING] Entering tool execution loop')
      let currentContent = assistantContent
      let loopCount = 0
      const MAX_LOOPS = 60
      
      while (loopCount < MAX_LOOPS) {
        console.log(`[PROCESSING] Loop ${loopCount + 1} - Checking for tool calls...`)
        
        // Check for invalid format
        const invalidFormat = detectInvalidToolFormat(currentContent)
        if (invalidFormat) {
          console.error('[PROCESSING] Invalid tool format detected:', invalidFormat)
          const errorMessage = createAssistantMessage(`⚠️ FORMAT ERROR: ${invalidFormat}`, 0)
          dispatch({ type: 'ADD_MESSAGE', payload: { ...errorMessage, id: Date.now() + '_formaterror' } })
          break
        }
        
        const toolCall = parseToolCall(currentContent)
        
        if (!toolCall) {
          console.log('[PROCESSING] No tool call found, ending loop')
          break
        }
        
        console.log(`[PROCESSING] Loop ${loopCount + 1} - Tool call found:`, toolCall.function)
        
        // Show which tool is executing
        console.log('[PROCESSING] Setting executingTool to:', toolCall.function)
        dispatch({ type: 'SET_EXECUTING_TOOL', payload: toolCall.function })
        
        // Check if tool requires user gesture
        const toolSpec = getToolSpec(toolCall.function)
        let toolResult: any
        
        if (toolSpec?.requiresUserGesture) {
          console.log('[PROCESSING] Executing UI tool (user gesture required):', toolCall.function)
          console.log('User activation before UI tool:', (navigator as any).userActivation?.isActive)
          toolResult = await executeUITool(toolCall)
        } else {
          console.log('[PROCESSING] Executing background tool:', toolCall.function)
          toolResult = await executeTool(toolCall)
        }
        
        console.log('[PROCESSING] Tool execution complete, result:', toolResult?.success ? 'SUCCESS' : 'FAILED')
        
        // Clear executing tool indicator
        console.log('[PROCESSING] Clearing executingTool')
        dispatch({ type: 'SET_EXECUTING_TOOL', payload: null })
        
        // If tool failed, add context to help AI not retry
        if (!toolResult?.success) {
          console.log('Tool failed, AI should not retry this exact call')
        }
        
        // Add tool result as message
        const resultToPass = toolResult?.success ? toolResult.result : `Error: ${toolResult?.error || 'Tool failed'}`
        const toolResultMessage = createAssistantMessage(`[TOOL RESULT]\n${resultToPass}`, 0)
        dispatch({ type: 'ADD_MESSAGE', payload: { ...toolResultMessage, id: Date.now() + '_toolresult_' + loopCount } })
        
        // Get agent's response to tool result (loopback)
        console.log(`[PROCESSING] Starting loopback ${loopCount + 1} - still processing...`)
        let followupContent = ""
        const followupMessageId = Date.now() + '_followup_' + loopCount
        
        console.log(`[PROCESSING] Streaming loopback response ${loopCount + 1}...`)
        const followupContextCount = await streamResponse(messageToSend, (chunk: string) => {
          followupContent += chunk
          
          if (followupContent.length === chunk.length) {
            console.log(`[PROCESSING] Loopback ${loopCount + 1} first chunk received`)
            const followupMessage = createAssistantMessage(followupContent, 0)
            dispatch({ type: 'ADD_MESSAGE', payload: { ...followupMessage, id: followupMessageId } })
          } else {
            dispatch({ type: 'UPDATE_MESSAGE', payload: { id: followupMessageId, content: followupContent } })
          }
        }, resultToPass)
        
        console.log(`[PROCESSING] Loopback ${loopCount + 1} complete, content length:`, followupContent.length)
        
        dispatch({ type: 'UPDATE_MESSAGE_CONTEXT', payload: { id: followupMessageId, contextCount: followupContextCount } })
        
        // Check if summarization is needed during tool loop
        await checkAndSummarize()
        
        currentContent = followupContent
        loopCount++
        console.log(`[PROCESSING] Loop ${loopCount} complete, checking for next tool call...`)
      }
      
      if (loopCount >= MAX_LOOPS) {
        console.warn('[PROCESSING] Reached max tool execution loops')
      }
      
      console.log('[PROCESSING] Tool loop exited after', loopCount, 'iterations')
      
    } catch (error: any) {
      dispatch({ type: 'SET_WAITING', payload: false })
      const currentContextCount = getTokenUsage().usage
      
      if (error.name === 'AbortError') {
        const interruptMessage = createAssistantMessage('[INTERRUPTED]', currentContextCount)
        dispatch({ type: 'ADD_MESSAGE', payload: interruptMessage })
      } else {
        const errorMessage = createAssistantMessage(`ERROR: ${error.message}`, currentContextCount)
        dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
        
        // Show alert for AI model errors using proper type checking
        if (globalAlertHandler && isAIModelError(error)) {
          globalAlertHandler('error', 'AI Model Not Available',
            'Enable Gemini Nano in Chrome flags and relaunch browser.',
            {
              label: 'Open Flags',
              onClick: openAIFlagsPage
            })
        }
      }
      console.log('[PROCESSING] Setting to FALSE (error path)')
      dispatch({ type: 'SET_PROCESSING', payload: false })
      return
    }
    
    console.log('[PROCESSING] Setting to FALSE (completion path)')
    dispatch({ type: 'SET_PROCESSING', payload: false })
  }

  const resetChat = () => {
    interruptAI()
    destroyAISession()
    dispatch({ type: 'RESET' })
    // Clear storage
    chrome.storage.local.remove(['chat_messages'])
  }

  const interruptChat = () => {
    interruptAI()
    dispatch({ type: 'SET_PROCESSING', payload: false })
    dispatch({ type: 'SET_WAITING', payload: false })
  }

  const copyContext = async (): Promise<string> => {
    const systemPrompt = getSystemPrompt()
    
    let contextText = ''
    
    // Include system prompt if available
    if (systemPrompt) {
      contextText += '=== SYSTEM PROMPT ===\n\n'
      contextText += systemPrompt
      contextText += '\n\n=== CONVERSATION ===\n\n'
    }
    
    // Add messages with truncated media
    contextText += state.messages.map(msg => {
      let content = msg.content
      
      // Truncate base64 images
      if (content.includes('data:image/')) {
        content = content.replace(
          /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
          (match) => {
            const preview = match.substring(0, 50)
            return `${preview}... [IMAGE_TRUNCATED_${match.length}_CHARS]`
          }
        )
      }
      
      // Truncate base64 audio
      if (content.includes('data:audio/')) {
        content = content.replace(
          /data:audio\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
          (match) => {
            const preview = match.substring(0, 50)
            return `${preview}... [AUDIO_TRUNCATED_${match.length}_CHARS]`
          }
        )
      }
      
      return `${msg.role.toUpperCase()}: ${content}`
    }).join('\n\n')
    
    return contextText
  }

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage, resetChat, interruptChat, copyContext, isInitialLoadComplete }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}
