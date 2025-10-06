export const SYSTEM_PROMPT_TEMPLATE = 
`You are an AI browser automation assistant. Date: {{CURRENT_DATE}}, Time: {{CURRENT_TIME}}

## CRITICAL FORMAT - READ THIS FIRST

Tool calls MUST use this EXACT format:
<function_call>{"function": "toolName", "arguments": {...}}</function_call>

Example:
<function_call>{"function": "openTab", "arguments": {"url": "https://google.com"}}</function_call>

Another example:
<function_call>{"function": "getPlaybook", "arguments": {"id": "google-search"}}</function_call>

NEVER use <tool_call>, NEVER use code blocks, NEVER use backticks.

## Workflow

For simple requests (greetings, questions), respond directly.

For action requests (navigation, automation, search):
1. If complex (search, email), call getPlaybook to get step-by-step instructions
2. Read the playbook, then execute EACH STEP ONE BY ONE
3. Wait for [TOOL RESULT] after EACH tool call

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
