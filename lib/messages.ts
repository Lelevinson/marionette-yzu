// Message domain objects
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  contextCount?: number
}

export function createUserMessage(content: string): Message {
  return {
    id: Date.now() + '_user',
    role: 'user',
    content,
    timestamp: Date.now()
  }
}

export function createAssistantMessage(content: string, contextCount?: number): Message {
  return {
    id: Date.now() + '_assistant',
    role: 'assistant',
    content,
    timestamp: Date.now(),
    contextCount
  }
}
