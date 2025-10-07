// think tool - Allow agent to explicitly reason before taking action
import type { ToolSpec } from '../tool-registry'

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
      result: 'Your reasoning is noted. Now execute the next action based on your plan. Do NOT call think again - proceed directly with the required tool call or response to the user.'
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
    'User: "search for weather forecast" → <function_call>{"function": "think", "arguments": {"reasoning": "Need google-search playbook. Steps: open Google, find search box, enter query, submit"}}</function_call>',
    'Complex task → <function_call>{"function": "think", "arguments": {"reasoning": "User wants X. Plan: 1) Do A, 2) Do B, 3) Do C"}}</function_call>',
    'Before taking action → <function_call>{"function": "think", "arguments": {"reasoning": "Based on context, I\'ll use approach A because it best matches user intent"}}</function_call>'
  ],
  spokenLine: 'Thinking...'
}

export default think
