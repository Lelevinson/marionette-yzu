import { useState, useRef, useCallback } from 'react'
import { MicrophonePermissionError, SpeechRecognitionUnavailableError } from './errors'
import { useMediaDevice } from './media-device-context'

interface UseSpeechRecognitionReturn {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => Promise<string>
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const { selectedMicId } = useMediaDevice()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const startListening = useCallback(async () => {
    // Check if Web Speech API is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      throw new SpeechRecognitionUnavailableError()
    }

    // Request microphone access with selected device
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
      }
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new MicrophonePermissionError()
      }
      throw error
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript("")
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      setTranscript((finalTranscript || interimTranscript).trim())
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        throw new MicrophonePermissionError()
      }
      // For other errors like 'no-speech', just log them
    }

    recognition.onend = () => {
      setIsListening(false)
      
      // Clean up media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [selectedMicId])

  const stopListening = useCallback(async (): Promise<string> => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
    // Clean up media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    const currentTranscript = transcript
    setTranscript("")
    return currentTranscript
  }, [transcript])

  return {
    isListening,
    transcript,
    startListening,
    stopListening
  }
}

