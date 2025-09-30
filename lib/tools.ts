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
        let jsonStr = match[1].trim()
        
        console.log('Original tool call JSON:', jsonStr)
        
        // Fix common AI mistakes
        // Replace {...} placeholder with {} (handles various spacing)
        jsonStr = jsonStr.replace(/"arguments"\s*:\s*\{\s*\.\.\.?\s*\}/g, '"arguments": {}')
        
        // Also handle case without quotes around ...
        jsonStr = jsonStr.replace(/"arguments"\s*:\s*\{\.\.\.?\}/g, '"arguments": {}')
        
        // If arguments is missing entirely, add empty object
        if (!jsonStr.includes('"arguments"')) {
          jsonStr = jsonStr.replace(/("function"\s*:\s*"[^"]+")/, '$1, "arguments": {}')
        }
        
        console.log('Fixed tool call JSON:', jsonStr)
        
        // Parse and validate
        const parsed = JSON.parse(jsonStr)
        
        // Ensure arguments exists
        if (!parsed.arguments) {
          parsed.arguments = {}
        }
        
        console.log('Parsed tool call:', parsed)
        
        return parsed
      } catch (e) {
        console.error('Failed to parse tool call JSON:', match[1], e)
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
