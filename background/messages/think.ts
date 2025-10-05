// think tool - Allow agent to explicitly reason before taking action
import type { ToolSpec } from '../../lib/tool-registry'

async function think(params: any) {
  try {
    const { reasoning } = params
    
    if (!reasoning) {
      return { success: false, error: 'Reasoning is required' }
    }
    
    // Just log and return - this is for agent's explicit reasoning
    console.log('[Agent Reasoning]:', reasoning)
    
    return {
      success: true,
      result: 'Reasoning noted. Proceed with your plan.'
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'think',
  description: 'State your reasoning and plan before taking action. Use this to think through the problem step-by-step.',
  parameters: [
    {
      name: 'reasoning',
      type: 'string',
      description: 'Your step-by-step reasoning and planned approach',
      required: true
    }
  ],
  examples: [
    'Before starting a task → think with reasoning: "The user wants X. I need to: 1) Do A, 2) Do B, 3) Do C"',
    'When making a decision → think with reasoning: "I see two options. Option A is better because..."',
    'Before a complex workflow → think with reasoning: "This requires the google-search playbook. Steps: ..."'
  ],
  spokenLine: '💭 Thinking...'
}

export default think
