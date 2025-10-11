import React, { useMemo, useState, useEffect, useRef } from "react"
import { Bug, Mic, RotateCcw, Maximize2, Settings, Flag, Volume2, VolumeX, Square } from "lucide-react"
import { useVoiceInput } from "../lib/use-voice-input"
import { useChatContext } from "../lib/chat-context"
import { useTTS } from "../lib/tts-context"
import { useSoundEffects } from "../lib/use-sound-effects"
import { openPermissionsPage, openAIFlagsPage } from "../lib/alert-context"
import { useOnboarding } from "../components/onboarding/onboarding-provider"
import { OnboardingFlow } from "../components/onboarding/onboarding-flow"
import { OnboardingRedirect } from "../components/onboarding/onboarding-redirect"
import { MicSelector } from "../components/mic-selector"
import { VoiceSelector } from "../components/voice-selector"
import { Waveform } from "../components/waveform"
import { RatingButtons } from "../components/rating-buttons"
import { parseToolCall } from "../lib/tools"
import { getSpokenLine } from "../lib/tool-registry"
import { getCompleteSentences } from "../lib/sentence-parser"

interface MainScreenProps {
  onNavigateToDebug: () => void
  fullHeight?: boolean
}

export const MainScreen = ({ onNavigateToDebug, fullHeight = false }: MainScreenProps) => {
  const { state: onboardingState, isPopup } = useOnboarding()
  const { isListening, transcript, handleMicClick } = useVoiceInput()
  const { state, sendMessage, resetChat, rateMessage, isInitialLoadComplete, interruptChat } = useChatContext()
  const { handleNewText, stop, currentSentence, isSpeaking, audioEnabled, setAudioEnabled } = useTTS()
  const soundEffects = useSoundEffects()
  const [textInput, setTextInput] = useState("")
  
  // Track last spoken assistant message to avoid replaying
  const lastSpokenTextRef = useRef<string>('')
  const wasSpeakingRef = useRef(false)
  
  // Track last displayed sentence to keep showing it when queue empties
  const [lastDisplayedSentence, setLastDisplayedSentence] = useState<string>('')
  
  // Get latest context count
  const latestContextCount = useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const msg = state.messages[i]
      if (msg.contextCount !== undefined) {
        return msg.contextCount
      }
    }
    return 0
  }, [state.messages])
  
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
        
        // Extract text before tool call, handling code blocks
        let contentToSplit = msg.content
        // Remove code block wrapper if present
        const codeBlockMatch = contentToSplit.match(/```(?:tool_code|tool_call|function_call|json)\s*\n?(.*?)```/s)
        if (codeBlockMatch) {
          contentToSplit = codeBlockMatch[1]
        }
        const textBeforeToolCall = contentToSplit.split('<function_call>')[0].trim()
        
        // If message only contains function call syntax (no text before it), don't display the raw syntax
        let displayText = textBeforeToolCall
        if (!displayText && msg.content.includes('<function_call>')) {
          displayText = '' // Don't show raw function call syntax
        } else if (!displayText) {
          displayText = msg.content // Fallback to full content only if no function call
        }
        
        return {
          id: msg.id,
          text: displayText ? getCompleteSentences(displayText) : '',
          toolCall: toolCall,
          spokenLine: toolCall ? getSpokenLine(toolCall.function, toolCall.arguments) : null,
          rating: msg.rating
        }
      }
    }
    return { id: '', text: '', toolCall: null, spokenLine: null, rating: null }
  }, [state.messages])


  // TTS effect - handle new text (only if it's different from what we've seen before)
  useEffect(() => {
    // Ensure we don't trigger TTS until messages have been restored
    if (!isInitialLoadComplete) {
      return
    }
    // Skip if text is same as last spoken
    if (latestResponse.text === lastSpokenTextRef.current) {
      return
    }
    
    // Update tracking and trigger TTS
    if (latestResponse.text) {
      lastSpokenTextRef.current = latestResponse.text
      handleNewText(latestResponse.text)
    } else if (latestResponse.spokenLine) {
      // Tool call - speak the spoken line (force speak since it might not end with punctuation)
      lastSpokenTextRef.current = latestResponse.spokenLine
      handleNewText(latestResponse.spokenLine, true)
    }
  }, [isInitialLoadComplete, latestResponse.text, latestResponse.spokenLine, handleNewText])

  // Update last displayed sentence when currentSentence changes
  useEffect(() => {
    if (currentSentence) {
      setLastDisplayedSentence(currentSentence)
    }
  }, [currentSentence])

  // Response complete sound - play when TTS finishes speaking
  useEffect(() => {
    // Detect when speaking stops (transition from true to false)
    if (wasSpeakingRef.current && !isSpeaking && !state.isProcessing && audioEnabled) {
      // Only play if we were speaking an actual response (not system message)
      if (latestResponse.text || latestResponse.spokenLine) {
        soundEffects.play('warmup') // Using long-expected-548.ogg
      }
    }
    wasSpeakingRef.current = isSpeaking
  }, [isSpeaking, state.isProcessing, latestResponse.text, latestResponse.spokenLine, audioEnabled, soundEffects])

  // Determine waveform state - follow TTS/speaking state, not backend processing state
  const waveformState = isListening 
    ? 'listening'
    : isSpeaking
    ? 'speaking'  // If TTS is active, always show speaking state
    : state.isWarmingUp
    ? 'warming'
    : state.executingTool
    ? 'tool'
    : state.isProcessing
    ? 'thinking'
    : 'idle'

  // Match text color to waveform state
  const getTextColor = (state: typeof waveformState) => {
    switch (state) {
      case 'listening': return 'text-red-500'      // Red 500
      case 'speaking': return 'text-green-500'     // Green 500
      case 'warming': return 'text-orange-400'     // Orange 400
      case 'thinking': return 'text-blue-500'      // Blue 500
      case 'tool': return 'text-purple-500'        // Purple 500
      case 'idle': return 'text-gray-600'          // Gray 600
      default: return 'text-gray-200'
    }
  }

  const handleTextSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && textInput.trim()) {
      // Interrupt any ongoing processing or TTS before sending new message
      if (state.isProcessing || isSpeaking) {
        handleInterrupt()
      }
      
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

  const handleInterrupt = () => {
    stop() // Stop TTS immediately
    interruptChat()
    soundEffects.stopAll()
  }

  const handleWaveformClick = () => {
    // Interrupt any ongoing processing or TTS before starting to listen
    if (state.isProcessing || isSpeaking) {
      handleInterrupt()
    }
    // Play listening sound effect
    soundEffects.play('listening')
    // Then toggle listening
    handleMicClick()
  }

  // Show redirect screen in popup when onboarding is needed
  if (isPopup && !onboardingState.isComplete && onboardingState.currentStep) {
    return <OnboardingRedirect />
  }

  return (
    <>
      {/* Show onboarding flow in side panel if not complete */}
      <OnboardingFlow />
      
      {/* Main app - hidden when onboarding is active */}
      <div 
        className="w-full bg-black text-white flex flex-col" 
        style={fullHeight ? { height: '100vh' } : { minHeight: '500px', maxHeight: '600px' }}
      >
        {/* Header */}
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm">MARIONETTE</div>
          
          {/* Context Indicator */}
          <div 
            className="relative group cursor-help"
            title={`${latestContextCount}/9216 tokens`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="rgb(31, 41, 55)"
                strokeWidth="2"
              />
              {/* Progress circle */}
              {latestContextCount > 0 && (
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke={latestContextCount > 7372 ? "rgb(239, 68, 68)" : latestContextCount > 4608 ? "rgb(251, 191, 36)" : "rgb(34, 197, 94)"}
                  strokeWidth="2"
                  strokeDasharray={`${(latestContextCount / 9216) * 50.265} 50.265`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              )}
            </svg>
            
            {/* Tooltip on hover */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {latestContextCount}/9216
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1 hover:bg-gray-800 rounded"
            title={audioEnabled ? "Mute audio" : "Unmute audio"}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          </button>
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
          {state.isProcessing && (
            <button
              onClick={handleInterrupt}
              className="p-1 hover:bg-gray-800 rounded text-red-500"
              title="Stop response"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
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
          <Waveform state={waveformState} onClick={handleWaveformClick} />
        </div>

        {isListening && (
          <div className="mt-3 text-xs text-gray-500 font-mono">listening...</div>
        )}

        {/* Transcript while listening */}
        {transcript && isListening && (
          <div className="mt-4 max-w-md text-center">
            <div className={`text-sm ${getTextColor(waveformState)}`}>
              {transcript}
            </div>
          </div>
        )}

        {/* Spoken text - show current or last sentence */}
        {!isListening && (currentSentence || lastDisplayedSentence) && (
          <div className="mt-4 max-w-md text-center">
            <div className={`text-sm ${getTextColor(waveformState)}`}>
              {currentSentence || lastDisplayedSentence}
            </div>
          </div>
        )}
        
        {/* Rating buttons - show only when response is complete */}
        {!state.isProcessing && !state.isInToolLoop && latestResponse.text && latestResponse.id && (
          <div className="mt-4 flex flex-col items-center justify-center gap-1">
            <div className="text-[10px] text-gray-500 font-mono">rate last response</div>
            <RatingButtons 
              messageId={latestResponse.id}
              currentRating={latestResponse.rating}
              onRate={rateMessage}
              size="md"
            />
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
    </>
  )
}
