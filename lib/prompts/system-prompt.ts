export const SYSTEM_PROMPT_TEMPLATE = 
`You are an AI browser automation assistant. Date: {{CURRENT_DATE}}, Time: {{CURRENT_TIME}}

## Current Context

{{CURRENT_CONTEXT}}

You control the user's browser. When user says "fill this form" or "click the button", they mean the current page they're viewing.

## Stored Memories

{{MEMORIES}}

IMPORTANT: When filling forms, USE this data first! Only ask user for information that's truly missing from memories above. Parse names intelligently (e.g., full names should be split into first and last names).

CRITICAL - NEVER HALLUCINATE DATA:
- If a memory mentions something (e.g., "User received OTP") but does NOT contain the actual VALUE, you MUST ask the user for it
- NEVER invent placeholder values like "000000", "123456", "test@example.com", "+15551234567"
- For sensitive fields (OTP codes, passwords, credit cards), ALWAYS ask the user even if a memory references them
- A memory saying "User received OTP" is NOT the same as having the actual OTP code - you must ask for the code itself

## Tool Call Format

<function_call>{"function": "toolName", "arguments": {...}}</function_call>

Never use <tool_call>, code blocks, or backticks. Empty args: {}

## Workflows

For complex tasks (forms, search, email, listening to audio), start with:
<function_call>{"function": "getPlaybook", "arguments": {"id": "fill-form"}}</function_call>

Then follow the playbook's step-by-step instructions.

## Key Rules

- ALWAYS start by calling captureScreenshot to see the current page before taking any actions
- After screenshot, use getAccessibilitySnapshot to find interactive elements
- Fill ALL form fields before clicking submit/next buttons
- Ask user for confirmation before submitting forms
- Store new personal info with storeMemory for future use
- To ask user for info, just respond with text (no askUser tool exists)

## Tools

{{TOOLS}}

{{PLAYBOOKS}}`

// Get current tab context (title and URL)
async function getCurrentContext(): Promise<string> {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (!tab) {
      return 'No active tab. User is likely in the extension popup/sidepanel.'
    }
    
    const title = tab.title || 'Untitled'
    const url = tab.url || ''
    
    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      return `Current Page: ${title}\nNote: This is a browser internal page - cannot interact with it.`
    }
    
    // Extract domain for cleaner display
    let domain = ''
    try {
      domain = new URL(url).hostname
    } catch {
      domain = url
    }
    
    return `Current Page: "${title}"\nURL: ${url}\nDomain: ${domain}`
  } catch (error) {
    console.error('[System Prompt] Error getting current context:', error)
    return 'Unable to detect current page. Use captureScreenshot to see what the user is viewing.'
  }
}

// Generate system prompt with current values
export async function getSystemPrompt(): Promise<string> {
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
  
  // Retrieve all memories
  const memories = await getAllMemories()
  
  // Get current tab context
  const currentContext = await getCurrentContext()
  
  return fillPromptPlaceholders(SYSTEM_PROMPT_TEMPLATE)
    .replace('{{CURRENT_DATE}}', dateStr)
    .replace('{{CURRENT_TIME}}', timeStr)
    .replace('{{MEMORIES}}', memories)
    .replace('{{CURRENT_CONTEXT}}', currentContext)
}

// Retrieve and format all stored memories
async function getAllMemories(): Promise<string> {
  try {
    // Get stored memories from chrome.storage
    const storage = await chrome.storage.local.get(['agent_memories'])
    const memories = storage.agent_memories || []
    
    if (memories.length === 0) {
      return 'No memories stored yet. When user provides personal information (name, email, phone, etc.), store it using storeMemory for future use.'
    }
    
    // Sort by timestamp (most recent first)
    const sortedMemories = memories.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    // Format memories for display
    const formattedMemories = sortedMemories.map((m: any, index: number) => {
      const tags = m.tags && m.tags.length > 0 ? ` [${m.tags.join(', ')}]` : ''
      return `${index + 1}. ${m.content}${tags}\n   Stored: ${m.date}`
    }).join('\n\n')
    
    return `You have ${memories.length} stored memories:\n\n${formattedMemories}\n\nUse this information when filling forms or responding to user requests. Store new information with storeMemory.`
  } catch (error) {
    console.error('[System Prompt] Error loading memories:', error)
    return 'Error loading memories. Proceed by asking user for needed information.'
  }
}

function fillPromptPlaceholders(template: string): string {
  const { generateToolDocumentation } = require('../tool-registry')
  const { TOOL_FORMAT } = require('../tool-docs')
  const { generatePlaybooksDocumentation } = require('../playbooks')
  const { CORE_TOOLS } = require('../core-tools')
  
  const toolDocs = generateToolDocumentation(CORE_TOOLS)
  const playbooksDocs = generatePlaybooksDocumentation()
  
  return template
    .replace('{{TOOLS}}', toolDocs)
    .replace('{{TOOL_FORMAT}}', TOOL_FORMAT)
    .replace('{{PLAYBOOKS}}', playbooksDocs)
}
