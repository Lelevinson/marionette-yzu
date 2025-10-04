import React, { useState } from "react"
import { ChatProvider } from "./lib/chat-context"
import { AlertProvider } from "./lib/alert-context"
import { MediaDeviceProvider } from "./lib/media-device-context"
import { TTSProvider } from "./lib/tts-context"
import { DebugScreen } from "./screens/debug-screen"
import { MainScreen } from "./screens/main-screen"
import "./style.css"

type Screen = 'main' | 'debug'

const Popup = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main')

  return (
    <AlertProvider>
      <MediaDeviceProvider>
        <TTSProvider>
          <ChatProvider>
            {currentScreen === 'main' ? (
              <MainScreen onNavigateToDebug={() => setCurrentScreen('debug')} />
            ) : (
              <DebugScreen onNavigateToMain={() => setCurrentScreen('main')} />
            )}
          </ChatProvider>
        </TTSProvider>
      </MediaDeviceProvider>
    </AlertProvider>
  )
}

export default Popup
