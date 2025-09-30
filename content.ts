export {}

console.log('Marionette content script loaded')

// Listen for audio capture requests from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'capture_tab_audio') {
    handleTabAudioCapture(message.streamId, message.duration)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }))
    return true // Indicates async response
  }
})

async function handleTabAudioCapture(streamId: string, duration: number): Promise<string> {
  try {
    console.log('Content script: Starting tab audio capture')
    
    // Get the media stream using the provided stream ID
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      } as any
    } as any)

    // Prevent tab audio from being muted (based on Stack Overflow solution)
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(audioContext.destination)

    // Create MediaRecorder to record the stream
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const audioChunks: Blob[] = []
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }
    
    // Start recording
    mediaRecorder.start()
    console.log(`Content script: Started recording audio for ${duration} seconds`)
    
    // Stop recording after specified duration
    setTimeout(() => {
      mediaRecorder.stop()
      stream.getTracks().forEach(track => track.stop())
      audioContext.close()
    }, duration * 1000)
    
    // Wait for recording to complete
    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        resolve(blob)
      }
    })
    
    // Convert blob to data URL
    const reader = new FileReader()
    const audioDataUrl = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(audioBlob)
    })
    
    console.log(`Content script: Audio recording completed: ${audioBlob.size} bytes`)
    return audioDataUrl
    
  } catch (error) {
    console.error('Content script: Error capturing tab audio:', error)
    throw error
  }
}

