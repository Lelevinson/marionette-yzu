// Conversation summarization using Chrome's built-in Summarizer API
import type { Message } from './messages'

const MAX_CONTEXT_SIZE = 9216
const SUMMARIZATION_THRESHOLD = 0.7 // 70%

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
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n')

    // Get summary
    const summary = await summarizer.summarize(conversationText, {
      context: 'Summarize the key points and actions taken in this conversation'
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
  return `[CONTEXT SUMMARIZED - Previous conversation]\n\n${summary}`
}
