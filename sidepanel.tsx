import React, { useState, useEffect } from "react"
import { ChatProvider } from "./lib/chat-context"
import { AlertProvider } from "./lib/alert-context"
import { MediaDeviceProvider } from "./lib/media-device-context"
import { TTSProvider } from "./lib/tts-context"
import { DebugScreen } from "./screens/debug-screen"
import { MainScreen } from "./screens/main-screen"
import { DEFAULT_SCREEN, type Screen } from "./lib/config"
import "./style.css"

const SidePanel = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(DEFAULT_SCREEN)

  useEffect(() => {
    // Force full height
    document.body.style.height = '100vh'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.height = '100vh'
  }, [])

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <AlertProvider>
        <MediaDeviceProvider>
          <TTSProvider>
            <ChatProvider>
            {currentScreen === 'main' ? (
              <MainScreen onNavigateToDebug={() => setCurrentScreen('debug')} fullHeight />
            ) : (
              <DebugScreen onNavigateToMain={() => setCurrentScreen('main')} fullHeight />
            )}
            </ChatProvider>
          </TTSProvider>
        </MediaDeviceProvider>
      </AlertProvider>
    </div>
  )
}

export default SidePanel

