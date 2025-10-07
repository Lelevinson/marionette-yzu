// getPlaybook tool - Retrieve a specific playbook by ID
import type { ToolSpec } from '../tool-registry'
import { getPlaybookById } from '../playbooks'
import { generateToolDocumentation, TOOL_FORMAT } from '../tool-docs'

async function getPlaybook(params: any) {
  try {
    const { id } = params
    
    if (!id) {
      return { success: false, error: 'Playbook ID is required' }
    }
    
    const playbook = getPlaybookById(id)
    
    if (!playbook) {
      return { success: false, error: `Playbook not found: ${id}` }
    }
    
    // Lazy load TOOL_REGISTRY to avoid circular dependency
    const { TOOL_REGISTRY } = require('../tool-registry')
    
    // Generate tool documentation for required tools
    const toolDocs = generateToolDocumentation(TOOL_REGISTRY, playbook.requiredTools)
    
    // Combine playbook content + tool definitions + format
    const fullPlaybook = `${playbook.contents}

## Tools for this workflow

${toolDocs}

${TOOL_FORMAT}`
    
    return {
      success: true,
      result: fullPlaybook
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'getPlaybook',
  description: 'Retrieve a specific workflow playbook by ID to get detailed step-by-step instructions',
  parameters: [
    {
      name: 'id',
      type: 'string',
      description: 'The playbook ID (e.g., "google-search", "send-email")',
      required: true
    }
  ],
  examples: [
    'User: "search for weather" → getPlaybook with id: "google-search" to retrieve search workflow',
    'User: "send email" → getPlaybook with id: "send-email" to retrieve email workflow',
    'When starting a complex workflow → getPlaybook to get detailed instructions'
  ],
  spokenLine: 'Getting workflow instructions'
}

export default getPlaybook
