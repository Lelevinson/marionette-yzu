import React, { useState, useRef, useEffect } from "react"
import { Copy, RotateCcw, Square } from "lucide-react"
import { getSystemPrompt } from "./lib/ai"
import { parseToolCall } from "./lib/tools"
import { type Message } from "./lib/messages"
import { ChatProvider, useChatContext } from "./lib/chat-context"
import "./style.css"

const ChatInterface = () => {
  const { state, sendMessage, resetChat, interruptChat } = useChatContext()
  const [input, setInput] = useState("")
  const [copyFeedback, setCopyFeedback] = useState("")
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.isWaitingForFirstChunk])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || state.isProcessing) return

    const userInput = input.trim()
    setInput("")
    await sendMessage(userInput)
  }

  const handleReset = () => {
    resetChat()
    setCopyFeedback("Reset complete")
    setTimeout(() => setCopyFeedback(""), 2000)
  }

  const handleInterrupt = () => {
    interruptChat()
  }

  const handleCopyContext = async () => {
    try {
      const systemPrompt = getSystemPrompt()
      
      let contextText = ''
      
      // Include system prompt if available
      if (systemPrompt) {
        contextText += '=== SYSTEM PROMPT ===\n\n'
        contextText += systemPrompt
        contextText += '\n\n=== CONVERSATION ===\n\n'
      }
      
      // Add messages
      contextText += state.messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')
      
      await navigator.clipboard.writeText(contextText)
      setCopyFeedback("Context copied (with system prompt)")
      setTimeout(() => setCopyFeedback(""), 2000)
    } catch (error) {
      setCopyFeedback("Copy failed")
      setTimeout(() => setCopyFeedback(""), 2000)
    }
  }


  const renderMessage = (message: Message) => {
    const toolCall = parseToolCall(message.content)
    
    // Check if it's a tool result message
    const isToolResult = message.content.startsWith('[TOOL RESULT]')
    
    if (toolCall) {
      const textBeforeToolCall = message.content.split('<function_call>')[0].trim()
      
      return (
        <div key={message.id} className="mb-2 font-mono text-xs">
          <div className="text-gray-500 mb-1">{message.role.toUpperCase()}</div>
          {textBeforeToolCall && (
            <div className="text-gray-200 whitespace-pre-wrap mb-2">{textBeforeToolCall}</div>
          )}
          <div className="text-gray-500 mb-1">TOOL_CALL</div>
          <div className="bg-gray-900 p-2 rounded border border-gray-700">
            <div className="text-gray-300">{toolCall.function}</div>
            {Object.keys(toolCall.arguments).length > 0 && (
              <div className="text-gray-400 mt-1 text-[10px]">
                {Object.entries(toolCall.arguments).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{' '}
                    <span className="text-gray-300">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {message.contextCount !== undefined && (
            <div className="text-gray-600 text-[10px] mt-1">
              CONTEXT: {message.contextCount}/9216 tokens
            </div>
          )}
        </div>
      )
    }
    
    if (isToolResult) {
      const resultContent = message.content.replace('[TOOL RESULT]\n', '')
      return (
        <div key={message.id} className="mb-2 font-mono text-xs">
          <div className="text-blue-400 mb-1">TOOL RESULT</div>
          <div className="bg-blue-950 p-2 rounded border border-blue-800 text-blue-200 whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto">
            {resultContent}
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className="mb-2 font-mono text-xs">
        <div className="text-gray-500 mb-1">{message.role.toUpperCase()}</div>
        <div className="text-gray-200 whitespace-pre-wrap">{message.content}</div>
        {message.role === 'assistant' && message.contextCount !== undefined && (
          <div className="text-gray-600 text-[10px] mt-1">
            CONTEXT: {message.contextCount}/9216 tokens
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-[420px] h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <div className="font-mono text-sm">DEBUG_CHAT</div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyContext}
            className="p-1 hover:bg-gray-800 rounded"
            title="Copy context"
          >
            <Copy className="w-4 h-4" />
          </button>
          {state.isProcessing && (
            <button
              onClick={handleInterrupt}
              className="p-1 hover:bg-gray-800 rounded"
              title="Stop response"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleReset}
            className="p-1 hover:bg-gray-800 rounded"
            title="Reset everything"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {state.messages.map(renderMessage)}
        
        {/* Waiting for first chunk loader */}
        {state.isWaitingForFirstChunk && (
          <div className="mb-4 font-mono text-xs">
            <div className="text-gray-500 mb-1">ASSISTANT</div>
            <div className="text-gray-400 flex items-center gap-1">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Feedback */}
      {copyFeedback && (
        <div className="px-3 py-1 text-xs text-green-400">
          {copyFeedback}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={state.isProcessing}
          placeholder="Type message..."
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-500 disabled:opacity-50"
        />
      </form>
    </div>
  )
}

const SidePanel = () => (
  <ChatProvider>
    <ChatInterface />
  </ChatProvider>
)

export default SidePanel
