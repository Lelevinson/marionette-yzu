// Tool Registry - Aggregates tool specs from individual tool modules
import { spec as captureScreenshotSpec } from '../background/messages/captureScreenshot'
import { spec as getPageTitleSpec } from '../background/messages/getPageTitle'
import { spec as openTabSpec } from '../background/messages/openTab'
import { spec as getAccessibilitySnapshotSpec } from '../background/messages/getAccessibilitySnapshot'
import { spec as clickElementSpec } from '../background/messages/clickElement'
import { spec as fillInputSpec } from '../background/messages/fillInput'
import { spec as findElementsSpec } from '../background/messages/findElements'
import { spec as listenSpec } from '../background/messages/listen'
import { spec as writeContentSpec } from '../background/messages/writeContent'
import { spec as storeMemorySpec } from '../background/messages/storeMemory'
import { spec as getMemoriesSpec } from '../background/messages/getMemories'
import { spec as translateTextSpec } from '../background/messages/translateText'
import { spec as detectLanguageSpec } from '../background/messages/detectLanguage'
import { spec as scrollUpSpec } from '../background/messages/scrollUp'
import { spec as scrollDownSpec } from '../background/messages/scrollDown'
import { spec as highlightSelectorSpec } from '../background/messages/highlightSelector'
import { spec as highlightTextSpec } from '../background/messages/highlightText'
import { spec as captureCurrentPageSpec } from '../background/messages/captureCurrentPage'
import { spec as searchVaultSpec } from '../background/messages/searchVault'
import { spec as getVaultStatsSpec } from '../background/messages/getVaultStats'
import { spec as getPlaybookSpec } from '../background/messages/getPlaybook'
import { spec as thinkSpec } from '../background/messages/think'

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
  spokenLine: string  // What AI says when executing this tool
  requiresUserGesture?: boolean  // If true, must be called from UI context
}

// Automatically aggregated from tool modules
export const TOOL_REGISTRY: ToolSpec[] = [
  thinkSpec,
  captureScreenshotSpec,
  getPageTitleSpec,
  openTabSpec,
  getAccessibilitySnapshotSpec,
  findElementsSpec,
  clickElementSpec,
  fillInputSpec,
  listenSpec,
  writeContentSpec,
  storeMemorySpec,
  getMemoriesSpec,
  translateTextSpec,
  detectLanguageSpec,
  scrollUpSpec,
  scrollDownSpec,
  highlightSelectorSpec,
  highlightTextSpec,
  captureCurrentPageSpec,
  searchVaultSpec,
  getVaultStatsSpec,
  getPlaybookSpec
]

// Generate formatted tool documentation for specific tools
export function generateToolDocumentation(toolNames?: string[]): string {
  const { generateToolDocumentation: genDocs } = require('./tool-docs')
  return genDocs(TOOL_REGISTRY, toolNames)
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

// Check if tool requires user gesture
export function requiresUserGesture(toolName: string): boolean {
  const spec = getToolSpec(toolName)
  return spec?.requiresUserGesture || false
}

// Get all tools that require user gesture
export function getUITools(): ToolSpec[] {
  return TOOL_REGISTRY.filter(tool => tool.requiresUserGesture)
}

// Get spoken line for a tool with parameter substitution
export function getSpokenLine(toolName: string, params?: Record<string, any>): string {
  const spec = getToolSpec(toolName)
  if (!spec) {
    return toolName // fallback to tool name if spec not found
  }
  
  let spokenLine = spec.spokenLine
  
  // Replace parameters in the spoken line (e.g., {url}, {query}, {value})
  if (params) {
    Object.keys(params).forEach(key => {
      const placeholder = `{${key}}`
      if (spokenLine.includes(placeholder)) {
        // For URLs, extract just the domain
        if (key === 'url') {
          try {
            const url = new URL(params[key])
            spokenLine = spokenLine.replace(placeholder, url.hostname)
          } catch {
            spokenLine = spokenLine.replace(placeholder, params[key])
          }
        } else {
          // For other params, just replace with value
          spokenLine = spokenLine.replace(placeholder, params[key])
        }
      }
    })
  }
  
  return spokenLine
}
