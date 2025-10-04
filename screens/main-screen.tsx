import React, { useMemo, useState, useEffect, useRef } from "react"
import { Bug, Mic, RotateCcw, Maximize2, Settings, Flag } from "lucide-react"
import { useVoiceInput } from "../lib/use-voice-input"
import { useChatContext } from "../lib/chat-context"
import { useTTS } from "../lib/tts-context"
import { openPermissionsPage, openAIFlagsPage } from "../lib/alert-context"
import { MicSelector } from "../components/mic-selector"
import { VoiceSelector } from "../components/voice-selector"
import { Waveform } from "../components/waveform"
import { parseToolCall } from "../lib/tools"
import { getSpokenLine } from "../lib/tool-registry"

interface MainScreenProps {
  onNavigateToDebug: () => void
  fullHeight?: boolean
}

const getCompleteSentences = (text: string): string => {
  const sentences: string[] = []
  const parts = text.split(/([.!?]\s+|\n+)/)
  
  let current = ''
  for (let i = 0; i < parts.length; i++) {
    current += parts[i]
    if (/[.!?]\s*$/.test(current.trim())) {
      sentences.push(current.trim())
      current = ''
    }
  }
  
  return sentences.join(' ')
}

export const MainScreen = ({ onNavigateToDebug, fullHeight = false }: MainScreenProps) => {
  const { isListening, transcript, handleMicClick } = useVoiceInput()
  const { state, sendMessage, resetChat, isInitialLoadComplete } = useChatContext()
  const { handleNewText, stop, currentSentence, isSpeaking } = useTTS()
  const [textInput, setTextInput] = useState("")
  
  // Track last spoken assistant message to avoid replaying
  const lastSpokenTextRef = useRef<string>('')
  
  // Mark initial load complete and record existing assistant messages
  useEffect(() => {
    if (isInitialLoadComplete && lastSpokenTextRef.current === '') {
      // Find the latest assistant message from storage and mark it as "already spoken"
      for (let i = state.messages.length - 1; i >= 0; i--) {
        const msg = state.messages[i]
        if (msg.role === 'assistant' && !msg.content.startsWith('[TOOL RESULT]')) {
          const toolCall = parseToolCall(msg.content)
          const textBeforeToolCall = msg.content.split('<function_call>')[0].trim()
          const text = getCompleteSentences(textBeforeToolCall || msg.content)
          lastSpokenTextRef.current = text
          console.log('[MainScreen] Marked initial message as spoken:', text.substring(0, 50))
          break
        }
      }
    }
  }, [isInitialLoadComplete, state.messages.length])

  // Get latest assistant message that's not a tool result
  const latestResponse = useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const msg = state.messages[i]
      if (msg.role === 'assistant' && !msg.content.startsWith('[TOOL RESULT]')) {
        const toolCall = parseToolCall(msg.content)
        const textBeforeToolCall = msg.content.split('<function_call>')[0].trim()
        
        return {
          text: getCompleteSentences(textBeforeToolCall || msg.content),
          toolCall: toolCall,
          spokenLine: toolCall ? getSpokenLine(toolCall.function, toolCall.arguments) : null
        }
      }
    }
    return { text: '', toolCall: null, spokenLine: null }
  }, [state.messages])

  // Display only current sentence being spoken
  const displayText = currentSentence

  // TTS effect - handle new text (only if it's different from what we've seen before)
  useEffect(() => {
    // Skip if text is same as last spoken
    if (latestResponse.text === lastSpokenTextRef.current) {
      return
    }
    
    // Update tracking and trigger TTS
    if (latestResponse.text) {
      lastSpokenTextRef.current = latestResponse.text
      handleNewText(latestResponse.text)
    } else if (latestResponse.spokenLine) {
      // Tool call - speak the spoken line
      lastSpokenTextRef.current = latestResponse.spokenLine
      handleNewText(latestResponse.spokenLine)
    }
  }, [latestResponse.text, latestResponse.spokenLine, handleNewText, stop])

  // Determine waveform state - pure event-driven, no complex conditions
  const waveformState = isListening 
    ? 'listening' 
    : state.executingTool
    ? 'tool'
    : state.isProcessing
    ? 'thinking'
    : isSpeaking 
    ? 'speaking'
    : 'idle'
  
  // Show processing indicator whenever agent is working (including during loopbacks)
  const showProcessingIndicator = state.isProcessing && !isListening && !transcript

  const handleTextSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInput.trim() && !state.isProcessing) {
      const input = textInput.trim()
      setTextInput("")
      await sendMessage(input)
    }
  }

  const handleOpenSidePanel = async () => {
    try {
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id })
      window.close()
    } catch (error) {
      console.error('Failed to open sidepanel:', error)
    }
  }

  return (
    <div 
      className="w-full bg-black text-white flex flex-col" 
      style={fullHeight ? { height: '100vh' } : { minHeight: '500px', maxHeight: '600px' }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <div className="font-mono text-sm">MARIONETTE</div>
        <div className="flex gap-2">
          <button
            onClick={openPermissionsPage}
            className="p-1 hover:bg-gray-800 rounded"
            title="Permissions"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={openAIFlagsPage}
            className="p-1 hover:bg-gray-800 rounded"
            title="Chrome Flags"
          >
            <Flag className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenSidePanel}
            className="p-1 hover:bg-gray-800 rounded"
            title="Open Side Panel"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleMicClick}
            className={`p-1 hover:bg-gray-800 rounded ${isListening ? 'text-red-500' : ''}`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={resetChat}
            className="p-1 hover:bg-gray-800 rounded"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onNavigateToDebug}
            className="p-1 hover:bg-gray-800 rounded"
            title="Debug"
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Waveform state={waveformState} onClick={handleMicClick} />
        </div>

        {isListening && (
          <div className="mt-3 text-xs text-gray-500 font-mono">listening...</div>
        )}

        {showProcessingIndicator && (
          <div className="mt-3 text-xs text-gray-500 font-mono animate-pulse">
            {state.executingTool ? `executing ${state.executingTool}...` : 'thinking...'}
          </div>
        )}

        {transcript && !latestResponse.spokenLine && (
          <div className="mt-4 max-w-md text-sm text-gray-400 text-center">
            {transcript}
          </div>
        )}

        {displayText && (
          <div className="mt-4 max-w-md text-center">
            <div className="text-sm text-gray-200">
              {displayText}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="flex-1 flex justify-end">
            <MicSelector />
          </div>
          <div className="flex-1 flex justify-start">
            <VoiceSelector />
          </div>
        </div>
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleTextSubmit}
          disabled={state.isProcessing}
          placeholder="type here..."
          className="w-full bg-transparent border-none text-sm font-mono text-gray-300 placeholder-gray-600 focus:outline-none disabled:opacity-50 text-center"
        />
      </div>
    </div>
  )
}
