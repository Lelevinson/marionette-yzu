import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface MediaDeviceContextValue {
  selectedMicId: string | null
  availableMics: MediaDeviceInfo[]
  setSelectedMicId: (deviceId: string) => void
  refreshDevices: () => Promise<void>
}

const MediaDeviceContext = createContext<MediaDeviceContextValue | null>(null)

export const MediaDeviceProvider = ({ children }: { children: ReactNode }) => {
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null)
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([])

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter(device => device.kind === 'audioinput')
      setAvailableMics(mics)
      
      // Check if selected mic still exists
      if (selectedMicId) {
        const micExists = mics.find(m => m.deviceId === selectedMicId)
        if (!micExists && mics.length > 0) {
          // Fallback to first available
          setSelectedMicId(mics[0].deviceId)
        }
      } else if (mics.length > 0) {
        // No mic selected, select default or first
        const defaultMic = mics.find(mic => mic.deviceId === 'default') || mics[0]
        setSelectedMicId(defaultMic.deviceId)
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
    }
  }, [selectedMicId])

  useEffect(() => {
    // Load from storage
    chrome.storage.local.get(['selected_mic_id'], (result) => {
      if (result.selected_mic_id) {
        setSelectedMicId(result.selected_mic_id)
      }
    })

    refreshDevices()
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
    }
  }, [refreshDevices])

  // Save to storage when mic changes
  useEffect(() => {
    if (selectedMicId) {
      chrome.storage.local.set({ selected_mic_id: selectedMicId })
    }
  }, [selectedMicId])

  return (
    <MediaDeviceContext.Provider value={{ selectedMicId, availableMics, setSelectedMicId, refreshDevices }}>
      {children}
    </MediaDeviceContext.Provider>
  )
}

export const useMediaDevice = () => {
  const context = useContext(MediaDeviceContext)
  if (!context) {
    throw new Error('useMediaDevice must be used within MediaDeviceProvider')
  }
  return context
}

