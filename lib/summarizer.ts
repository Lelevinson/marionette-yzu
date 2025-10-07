// Conversation summarization using Chrome's built-in Summarizer API
import type { Message } from './messages'

const MAX_CONTEXT_SIZE = 9216
const SUMMARIZATION_THRESHOLD = 0.8 // 80%

export function shouldSummarize(currentTokens: number): boolean {
  return currentTokens >= MAX_CONTEXT_SIZE * SUMMARIZATION_THRESHOLD
}

export async function summarizeConversation(messages: Message[]): Promise<string> {
  // Check if Summarizer API is available
  if (!('Summarizer' in self)) {
    throw new Error('Summarizer API not available')
  }

  try {
    const availability = await (self as any).Summarizer.availability()
    
    if (availability === 'unavailable') {
      throw new Error('Summarizer model unavailable')
    }

    // Create summarizer with appropriate options
    const summarizer = await (self as any).Summarizer.create({
      sharedContext: 'This is a conversation between a user and an AI browser automation assistant',
      type: 'key-points',
      format: 'plain-text',
      length: 'medium',
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          console.log(`Summarizer model download: ${Math.round(e.loaded * 100)}%`)
        })
      }
    })

    // Format conversation for summarization
    const conversationText = messages
      .map(msg => {
        let content = msg.content

        // Truncate base64 images
        if (content.includes('data:image/')) {
          content = content.replace(
            /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
            (match) => {
              const preview = match.substring(0, 50)
              return `${preview}... [IMAGE_TRUNCATED_${match.length}_CHARS]`
            }
          )
        }

        // Truncate base64 audio
        if (content.includes('data:audio/')) {
          content = content.replace(
            /data:audio\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
            (match) => {
              const preview = match.substring(0, 50)
              return `${preview}... [AUDIO_TRUNCATED_${match.length}_CHARS]`
            }
          )
        }

        return `${msg.role.toUpperCase()}: ${content}`
      })
      .join('\n\n')

    // Get summary
    const summary = await summarizer.summarize(conversationText, {
      context: 'Summarize what the user requested, what actions were taken, what information was gathered, and what task is currently in progress or needs to be completed next'
    })

    // Clean up
    summarizer.destroy?.()

    return summary
  } catch (error: any) {
    console.error('Summarization failed:', error)
    throw new Error(`Failed to summarize: ${error.message}`)
  }
}

export function formatSummaryMessage(summary: string): string {
  return `[CONTEXT SUMMARIZED - Previous conversation]\n\n${summary}\n\n---\n\nIMPORTANT: Based on the summary above, if you were in the middle of a task or workflow, CONTINUE where you left off. If the user requested an action that hasn't been completed yet, proceed to complete it now. DO NOT wait for new instructions - act on the context provided.`
}
