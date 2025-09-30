// Tool execution module
export interface ToolCall {
  function: string
  arguments: Record<string, any>
}

export function detectInvalidToolFormat(content: string): string | null {
  // Check for common wrong formats
  if (content.includes('```tool_code')) {
    return 'Invalid format detected: ```tool_code - must use <function_call> with angle brackets'
  }
  if (content.includes('```function_call')) {
    return 'Invalid format detected: ```function_call - must use <function_call> with angle brackets'
  }
  if (content.includes('```json') && content.includes('function')) {
    return 'Invalid format detected: ```json code block - must use <function_call> with angle brackets'
  }
  if (/print\s*\(/.test(content) && /get|click|fill|open/i.test(content)) {
    return 'Invalid format detected: print() syntax - must use <function_call> format'
  }
  return null
}

export function parseToolCall(content: string): ToolCall | null {
  if (content.includes('<function_call>')) {
    const match = content.match(/<function_call>(.*?)<\/function_call>/s)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch (e) {
        console.error('Failed to parse tool call JSON:', e)
        return null
      }
    }
  }
  return null
}

export async function executeTool(toolCall: ToolCall): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'run_tool',
      payload: {
        toolName: toolCall.function,
        parameters: toolCall.arguments
      }
    }, resolve)
  })
}
