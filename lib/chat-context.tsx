import React, { createContext, useContext, useReducer, type ReactNode } from 'react'
import { type Message, createUserMessage, createAssistantMessage } from './messages'
import { streamResponse, getTokenUsage, destroySession as destroyAISession, interrupt as interruptAI } from './ai'
import { parseToolCall, executeTool, detectInvalidToolFormat } from './tools'

interface ChatState {
  messages: Message[]
  isProcessing: boolean
  isWaitingForFirstChunk: boolean
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'UPDATE_MESSAGE_CONTEXT'; payload: { id: string; contextCount: number } }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_WAITING'; payload: boolean }
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
    
    case 'RESET':
      return { messages: [], isProcessing: false, isWaitingForFirstChunk: false }
    
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
}

const ChatContext = createContext<ChatContextValue | null>(null)

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    isProcessing: false,
    isWaitingForFirstChunk: false
  })

  const sendMessage = async (userInput: string) => {
    dispatch({ type: 'SET_PROCESSING', payload: true })
    dispatch({ type: 'SET_WAITING', payload: true })
    
    // Add user message
    const userMessage = createUserMessage(userInput)
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage })
    
    // Stream AI response
    let assistantContent = ""
    let assistantMessageId = Date.now() + '_assistant'
    
    try {
      const contextCount = await streamResponse(userInput, (chunk: string) => {
        assistantContent += chunk
        
        if (assistantContent.length === chunk.length) {
          // First chunk - add message
          dispatch({ type: 'SET_WAITING', payload: false })
          const assistantMessage = createAssistantMessage(assistantContent)
          assistantMessageId = assistantMessage.id
          dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage })
        } else {
          // Update existing message
          dispatch({ type: 'UPDATE_MESSAGE', payload: { id: assistantMessageId, content: assistantContent } })
        }
      })
      
      // Update message with context count
      dispatch({ type: 'UPDATE_MESSAGE_CONTEXT', payload: { id: assistantMessageId, contextCount } })
      
      // Tool execution loop
      let currentContent = assistantContent
      let loopCount = 0
      const MAX_LOOPS = 60
      
      while (loopCount < MAX_LOOPS) {
        // Check for invalid format
        const invalidFormat = detectInvalidToolFormat(currentContent)
        if (invalidFormat) {
          console.error('Invalid tool format detected:', invalidFormat)
          const errorMessage = createAssistantMessage(`⚠️ FORMAT ERROR: ${invalidFormat}`, 0)
          dispatch({ type: 'ADD_MESSAGE', payload: { ...errorMessage, id: Date.now() + '_formaterror' } })
          break
        }
        
        const toolCall = parseToolCall(currentContent)
        
        if (!toolCall) {
          console.log('No tool call found, ending loop')
          break
        }
        
        console.log(`Loop ${loopCount + 1} - Tool call:`, toolCall)
        const toolResult = await executeTool(toolCall)
        console.log('Tool result:', toolResult)
        
        // Add tool result as message
        const resultToPass = toolResult?.success ? toolResult.result : `Error: ${toolResult?.error || 'Tool failed'}`
        const toolResultMessage = createAssistantMessage(`[TOOL RESULT]\n${resultToPass}`, 0)
        dispatch({ type: 'ADD_MESSAGE', payload: { ...toolResultMessage, id: Date.now() + '_toolresult_' + loopCount } })
        
        // Get agent's response to tool result
        let followupContent = ""
        const followupMessageId = Date.now() + '_followup_' + loopCount
        
        const followupContextCount = await streamResponse(userInput, (chunk: string) => {
          followupContent += chunk
          
          if (followupContent.length === chunk.length) {
            const followupMessage = createAssistantMessage(followupContent, 0)
            dispatch({ type: 'ADD_MESSAGE', payload: { ...followupMessage, id: followupMessageId } })
          } else {
            dispatch({ type: 'UPDATE_MESSAGE', payload: { id: followupMessageId, content: followupContent } })
          }
        }, resultToPass)
        
        dispatch({ type: 'UPDATE_MESSAGE_CONTEXT', payload: { id: followupMessageId, contextCount: followupContextCount } })
        
        currentContent = followupContent
        loopCount++
      }
      
      if (loopCount >= MAX_LOOPS) {
        console.warn('Reached max tool execution loops')
      }
      
    } catch (error: any) {
      dispatch({ type: 'SET_WAITING', payload: false })
      const currentContextCount = getTokenUsage().usage
      
      if (error.name === 'AbortError') {
        const interruptMessage = createAssistantMessage('[INTERRUPTED]', currentContextCount)
        dispatch({ type: 'ADD_MESSAGE', payload: interruptMessage })
      } else {
        const errorMessage = createAssistantMessage(`ERROR: ${error.message}`, currentContextCount)
        dispatch({ type: 'ADD_MESSAGE', payload: errorMessage })
      }
      dispatch({ type: 'SET_PROCESSING', payload: false })
      return
    }
    
    dispatch({ type: 'SET_PROCESSING', payload: false })
  }

  const resetChat = () => {
    interruptAI()
    destroyAISession()
    dispatch({ type: 'RESET' })
  }

  const interruptChat = () => {
    interruptAI()
    dispatch({ type: 'SET_PROCESSING', payload: false })
    dispatch({ type: 'SET_WAITING', payload: false })
  }

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage, resetChat, interruptChat }}>
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
