// Tool Registry - Aggregates tool specs from individual tool modules
import { spec as captureScreenshotSpec } from '../background/messages/captureScreenshot'
import { spec as getPageTitleSpec } from '../background/messages/getPageTitle'
import { spec as openTabSpec } from '../background/messages/openTab'
import { spec as getAccessibilitySnapshotSpec } from '../background/messages/getAccessibilitySnapshot'
import { spec as clickElementSpec } from '../background/messages/clickElement'
import { spec as fillInputSpec } from '../background/messages/fillInput'

export interface ToolParameter {
  name: string
  type: string
  description: string
  required: boolean
}

export interface ToolSpec {
  name: string
  description: string
  parameters: ToolParameter[]
  examples: string[]
}

// Automatically aggregated from tool modules
export const TOOL_REGISTRY: ToolSpec[] = [
  captureScreenshotSpec,
  getPageTitleSpec,
  openTabSpec,
  getAccessibilitySnapshotSpec,
  clickElementSpec,
  fillInputSpec
]

// Generate formatted tool documentation for the system prompt
export function generateToolDocumentation(): string {
  let doc = ''
  
  for (const tool of TOOL_REGISTRY) {
    doc += `### ${tool.name}\n\n`
    doc += `${tool.description}\n\n`
    
    if (tool.parameters.length > 0) {
      doc += '**Parameters:**\n'
      for (const param of tool.parameters) {
        const requiredTag = param.required ? '(required)' : '(optional)'
        doc += `- \`${param.name}\` (${param.type}) ${requiredTag}: ${param.description}\n`
      }
      doc += '\n'
    } else {
      doc += '**Parameters:** None\n\n'
    }
    
    if (tool.examples.length > 0) {
      doc += '**Usage Examples:**\n'
      for (const example of tool.examples) {
        doc += `- ${example}\n`
      }
      doc += '\n'
    }
  }
  
  return doc
}

// Get list of tool names for quick reference
export function getToolNames(): string[] {
  return TOOL_REGISTRY.map(tool => tool.name)
}

// Validate if a tool exists
export function isValidTool(toolName: string): boolean {
  return TOOL_REGISTRY.some(tool => tool.name === toolName)
}

// Get tool spec by name
export function getToolSpec(toolName: string): ToolSpec | undefined {
  return TOOL_REGISTRY.find(tool => tool.name === toolName)
}
