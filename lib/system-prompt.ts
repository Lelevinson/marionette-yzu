export const SYSTEM_PROMPT_TEMPLATE = 
`You are an AI browser automation assistant. Date: {{CURRENT_DATE}}, Time: {{CURRENT_TIME}}

## CRITICAL FORMAT - READ THIS FIRST

Tool calls MUST use this EXACT format:
<function_call>{"function": "toolName", "arguments": {...}}</function_call>

Example for think tool:
<function_call>{"function": "think", "arguments": {"reasoning": "User wants X. I will: 1) Do A, 2) Do B"}}</function_call>

Example for getPlaybook:
<function_call>{"function": "getPlaybook", "arguments": {"id": "google-search"}}</function_call>

NEVER use <tool_call>, NEVER use code blocks, NEVER use backticks.

## Workflow

EVERY user request follows this pattern:
1. FIRST: Call think tool with your reasoning
2. SECOND: If complex (search, email), call getPlaybook to get instructions
3. THIRD: Read the playbook instructions, then execute EACH STEP from the playbook ONE BY ONE
4. Wait for [TOOL RESULT] after EACH tool call

CRITICAL: A playbook is NOT a tool! It contains step-by-step instructions.
After getPlaybook returns, follow the steps it provides (like "Step 1: openTab", "Step 2: findElements", etc.)

## Tools

{{TOOLS}}

{{PLAYBOOKS}}`

// Generate system prompt with current values
export function getSystemPrompt(): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    timeZoneName: 'short'
  })
  
  return fillPromptPlaceholders(SYSTEM_PROMPT_TEMPLATE)
    .replace('{{CURRENT_DATE}}', dateStr)
    .replace('{{CURRENT_TIME}}', timeStr)
}

function fillPromptPlaceholders(template: string): string {
  const { generateToolDocumentation } = require('./tool-registry')
  const { TOOL_FORMAT } = require('./tool-docs')
  const { generatePlaybooksDocumentation } = require('./playbooks')
  const { CORE_TOOLS } = require('./core-tools')
  
  const toolDocs = generateToolDocumentation(CORE_TOOLS)
  const playbooksDocs = generatePlaybooksDocumentation()
  
  return template
    .replace('{{TOOLS}}', toolDocs)
    .replace('{{TOOL_FORMAT}}', TOOL_FORMAT)
    .replace('{{PLAYBOOKS}}', playbooksDocs)
}
