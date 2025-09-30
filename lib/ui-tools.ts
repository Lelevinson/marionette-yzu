// Tools that must execute in UI context (require user gesture)
// Automatically loads ALL tools with requiresUserGesture: true from registry
import type { ToolCall } from './tools'
import { getUITools } from './tool-registry'

// Build handler map automatically from imports
const TOOL_IMPLEMENTATIONS: Record<string, (params: any) => Promise<any>> = {
  // None currently - listen uses Plasmo messaging
}

export async function executeUITool(toolCall: ToolCall): Promise<any> {
  console.log('=== EXECUTING IN UI CONTEXT ===')
  console.log('Has user activation:', (navigator as any).userActivation?.isActive)
  console.log('Window object:', typeof window)
  console.log('Chrome runtime:', chrome.runtime.id)
  console.log('Tool:', toolCall.function)
  console.log('================================')
  
  const handler = TOOL_IMPLEMENTATIONS[toolCall.function]
  
  if (!handler) {
    return { success: false, error: `UI tool ${toolCall.function} not implemented in ui-tools.ts` }
  }
  
  const result = await handler(toolCall.arguments)
  console.log('UI tool result:', result)
  return result
}

// Validate at runtime that all UI tools from registry are implemented
export function validateUITools(): void {
  const uiToolSpecs = getUITools()
  const missing = uiToolSpecs.filter(spec => !TOOL_IMPLEMENTATIONS[spec.name])
  
  if (missing.length > 0) {
    console.error('❌ Missing UI tool implementations:', missing.map(t => t.name))
    console.error('Add these to ui-tools.ts TOOL_IMPLEMENTATIONS')
  } else {
    console.log('✅ All UI tools implemented:', uiToolSpecs.map(t => t.name))
  }
}
