// Simple AI module
import { generateToolDocumentation, getToolNames, TOOL_REGISTRY } from './tool-registry'
import { SYSTEM_PROMPT_TEMPLATE } from './system-prompt'

let aiSession: any = null
let currentController: AbortController | null = null
let filledSystemPrompt: string | null = null

// Fill in runtime placeholders in the prompt
function fillPromptPlaceholders(template: string): string {
  const now = new Date()
  
  // Format date: e.g., "Tuesday, September 30, 2025"
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // Format time: e.g., "14:35 PST"
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
  
  const placeholders: Record<string, string> = {
    '{{CURRENT_DATE}}': dateFormatter.format(now),
    '{{CURRENT_TIME}}': timeFormatter.format(now),
    '{{TOOL_COUNT}}': TOOL_REGISTRY.length.toString(),
    '{{TOOLS}}': generateToolDocumentation(),
    '{{TOOL_NAMES}}': getToolNames().join(', ')
  }
  
  let filled = template
  for (const [placeholder, value] of Object.entries(placeholders)) {
    filled = filled.replace(new RegExp(placeholder, 'g'), value)
  }
  
  return filled
}

async function ensureSession() {
  if (!aiSession) {
    const availability = await (window as any).LanguageModel.availability()
    if (availability === 'unavailable') {
      throw new Error('AI model unavailable')
    }
    
    // Fill template with runtime values
    const prompt = fillPromptPlaceholders(SYSTEM_PROMPT_TEMPLATE)
    
    // Store the filled prompt for debugging
    filledSystemPrompt = prompt
    
    console.log('System prompt loaded with', TOOL_REGISTRY.length, 'tools')

    aiSession = await (window as any).LanguageModel.create({
      initialPrompts: [{ role: 'system', content: prompt }],
      expectedInputs: [{ type: 'text' }, { type: 'image' }, { type: 'audio' }]
    })
  }
}

export async function streamResponse(message: string, onChunk: (chunk: string) => void, toolResult?: any): Promise<number> {
  await ensureSession()
  
  currentController = new AbortController()
  
  let promptInput: any = message
  
  if (toolResult) {
    // Check if tool result is an image (data URL)
    if (typeof toolResult === 'string' && toolResult.startsWith('data:image/')) {
      // Convert data URL to blob for multimodal input
      const response = await fetch(toolResult)
      const blob = await response.blob()

      promptInput = [{
        role: 'user',
        content: [
          { type: 'text', value: `${message}\n\nHere's the screenshot:` },
          { type: 'image', value: blob }
        ]
      }]
    }
    // Check if tool result is audio (data URL)
    else if (typeof toolResult === 'string' && toolResult.startsWith('data:audio/')) {
      // Convert data URL to blob for multimodal input
      const response = await fetch(toolResult)
      const blob = await response.blob()

      promptInput = [{
        role: 'user',
        content: [
          { type: 'text', value: `${message}\n\nHere's the audio recording:` },
          { type: 'audio', value: blob }
        ]
      }]
    } else {
      promptInput = `${message}\n\nTool result: ${toolResult}`
    }
  }
  
  const stream = aiSession.promptStreaming(promptInput, { signal: currentController.signal })
  
  for await (const chunk of stream) {
    onChunk(chunk)
  }
  
  currentController = null
  
  // Return context count after completion
  console.log('DEBUG: Stream completed, checking token usage')
  console.log('DEBUG: aiSession.inputUsage after completion:', aiSession.inputUsage)
  console.log('DEBUG: aiSession.inputQuota after completion:', aiSession.inputQuota)
  
  return aiSession.inputUsage || 0
}

export function interrupt() {
  if (currentController) {
    currentController.abort()
    currentController = null
  }
}

export function getTokenUsage() {
  console.log('DEBUG: getTokenUsage called')
  console.log('DEBUG: aiSession exists:', !!aiSession)
  
  if (!aiSession) {
    console.log('DEBUG: No session, returning 0')
    return { usage: 0, quota: 9216 }
  }
  
  console.log('DEBUG: aiSession.inputUsage:', aiSession.inputUsage)
  console.log('DEBUG: aiSession.inputQuota:', aiSession.inputQuota)
  
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
}

export function getSystemPrompt(): string | null {
  return filledSystemPrompt
}
