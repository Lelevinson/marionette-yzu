// Simple AI module
import { E2E_TEST_CONFIG } from "./e2e-config"
import { getSystemPrompt, getCurrentContext } from "./prompts/system-prompt"
import { TOOL_REGISTRY } from "./tool-registry"

let aiSession: any = null
let currentController: AbortController | null = null
let filledSystemPrompt: string | null = null
let isFirstPrompt = true
let sessionIsMultimodal = false

async function ensureSession() {
  if (!aiSession) {
    const availability = await (window as any).LanguageModel.availability()
    console.log("[AI] LanguageModel availability:", availability)

    if (availability === "unavailable") {
      throw new Error(
        "AI model unavailable. Please enable Gemini Nano in chrome://flags/#prompt-api-for-gemini-nano and restart Chrome."
      )
    }

    // Fill template with runtime values (now async to load memories)
    const prompt = await getSystemPrompt()

    // Store the filled prompt for debugging
    filledSystemPrompt = prompt

    console.log("System prompt loaded with", TOOL_REGISTRY.length, "tools")

    const baseOptions: any = {
      initialPrompts: [{ role: "system", content: prompt }]
    }

    // If model needs downloading, add a monitor to track progress
    if (availability !== "available") {
      console.log("[AI] Model not immediately available, adding download monitor...")
      baseOptions.monitor = (m: any) => {
        m.addEventListener("downloadprogress", (e: any) => {
          console.log(`[AI] Model download progress: ${(e.loaded * 100).toFixed(0)}%`)
        })
      }
    }

    // Try with multimodal support first, fall back to text-only
    // Multimodal requires chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
    try {
      console.log("[AI] Attempting to create session with multimodal support...")
      aiSession = await (window as any).LanguageModel.create({
        ...baseOptions,
        expectedInputs: [{ type: "text" }, { type: "image" }, { type: "audio" }]
      })
      sessionIsMultimodal = true
      console.log("[AI] Session created with multimodal support")
    } catch (multimodalErr: any) {
      console.warn("[AI] Multimodal session failed, trying text-only:", multimodalErr.message)
      try {
        aiSession = await (window as any).LanguageModel.create(baseOptions)
        sessionIsMultimodal = false
        console.log("[AI] Session created with text-only support")
      } catch (textErr: any) {
        console.error("[AI] Text-only session also failed:", textErr)
        console.error("[AI] Availability was:", availability)
        throw textErr
      }
    }
  }
}

export async function streamResponse(
  message: string,
  onChunk: (chunk: string) => void,
  toolResult?: any,
  onWarmingUp?: () => void,
  onWarmupComplete?: () => void
): Promise<number> {
  await ensureSession()

  // Notify warmup if this is the first prompt (the actual slow part)
  if (isFirstPrompt && onWarmingUp && !E2E_TEST_CONFIG.SKIP_WARMUP_PHASE) {
    console.log("[AI] First prompt - model warming up...")
    onWarmingUp()
  }

  currentController = new AbortController()

  // Inject fresh page context into each message so the model always knows
  // what page the user is on (the system prompt's context is frozen at session start)
  let contextualMessage = message
  try {
    const pageContext = await getCurrentContext()
    contextualMessage = `[Page Context: ${pageContext}]\n\n${message}`
  } catch (err) {
    console.warn('[AI] Failed to get page context for message:', err)
  }

  let promptInput: any = contextualMessage

  if (toolResult) {
    // Check if tool result is an image (data URL)
    if (
      typeof toolResult === "string" &&
      toolResult.startsWith("data:image/")
    ) {
      if (sessionIsMultimodal) {
        // Convert data URL to blob for multimodal input
        const response = await fetch(toolResult)
        const blob = await response.blob()

        promptInput = [
          {
            role: "user",
            content: [
              { type: "text", value: `${message}\n\nHere's the screenshot:` },
              { type: "image", value: blob }
            ]
          }
        ]
      } else {
        // Text-only session: describe the screenshot instead of sending image
        promptInput = `${message}\n\n[Screenshot captured of the current page. The session does not support image input, but the screenshot was taken successfully.]`
      }
    }
    // Check if tool result is audio (data URL)
    else if (
      typeof toolResult === "string" &&
      toolResult.startsWith("data:audio/")
    ) {
      if (sessionIsMultimodal) {
        // Convert data URL to blob for multimodal input
        const response = await fetch(toolResult)
        const blob = await response.blob()

        promptInput = [
          {
            role: "user",
            content: [
              {
                type: "text",
                value: `${message}\n\nHere's the audio recording:`
              },
              { type: "audio", value: blob }
            ]
          }
        ]
      } else {
        // Text-only session: describe the audio instead of sending blob
        promptInput = `${message}\n\n[Audio recording captured. The session does not support audio input, but the recording was taken successfully.]`
      }
    } else {
      promptInput = `${message}\n\nTool result: ${toolResult}`
    }
  }

  const stream = aiSession.promptStreaming(promptInput, {
    signal: currentController.signal
  })

  let firstChunk = true
  for await (const chunk of stream) {
    // Notify warmup complete on first token
    if (
      firstChunk &&
      isFirstPrompt &&
      onWarmupComplete &&
      !E2E_TEST_CONFIG.SKIP_WARMUP_PHASE
    ) {
      console.log("[AI] Model warmup complete - first token received")
      onWarmupComplete()
      isFirstPrompt = false
      firstChunk = false
    } else if (
      firstChunk &&
      isFirstPrompt &&
      E2E_TEST_CONFIG.SKIP_WARMUP_PHASE
    ) {
      // Skip warmup callbacks but still mark first prompt as done
      isFirstPrompt = false
      firstChunk = false
    }
    onChunk(chunk)
  }

  currentController = null

  // Return context count after completion
  console.log("DEBUG: Stream completed, checking token usage")
  console.log(
    "DEBUG: aiSession.inputUsage after completion:",
    aiSession.inputUsage
  )
  console.log(
    "DEBUG: aiSession.inputQuota after completion:",
    aiSession.inputQuota
  )

  return aiSession.inputUsage || 0
}

export function interrupt() {
  if (currentController) {
    currentController.abort()
    currentController = null
  }
}

export function getTokenUsage() {
  console.log("DEBUG: getTokenUsage called")
  console.log("DEBUG: aiSession exists:", !!aiSession)

  if (!aiSession) {
    console.log("DEBUG: No session, returning 0")
    return { usage: 0, quota: 9216 }
  }

  console.log("DEBUG: aiSession.inputUsage:", aiSession.inputUsage)
  console.log("DEBUG: aiSession.inputQuota:", aiSession.inputQuota)

  return {
    usage: aiSession.inputUsage || 0,
    quota: aiSession.inputQuota || 9216
  }
}

export function destroySession() {
  if (aiSession) {
    aiSession.destroy()
    aiSession = null
  }
  filledSystemPrompt = null
  // Reset first prompt flag so next prompt will trigger warmup
  isFirstPrompt = true
  sessionIsMultimodal = false
}

export function isMultimodalSession(): boolean {
  return sessionIsMultimodal
}

export function getFilledSystemPrompt(): string | null {
  return filledSystemPrompt
}
