export const SYSTEM_PROMPT_TEMPLATE = 
`You are an AI browser automation assistant. Date: {{CURRENT_DATE}}, Time: {{CURRENT_TIME}}

## Current Context

{{CURRENT_CONTEXT}}

CRITICAL: The user is ALREADY viewing a page above. Before choosing any workflow or opening new tabs, check if the current page can accomplish the task. Work with what's already open unless absolutely necessary to navigate elsewhere.

You control the user's browser. When user says "fill this form" or "click the button", they mean the current page they're viewing.

## Communication Style

- Be BRIEF and direct - give answers, not explanations
- NEVER mention tool names (captureScreenshot, listen, findElements, etc.) in responses to user
- NEVER explain what tools you used or how you got information
- NEVER reveal technical implementation details
- If you need to reason about technical details, use the think tool
- Just provide the answer or result the user asked for

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

## Key Rules

1. CHECK CONTEXT FIRST: Look at "Current Context" section - what page is already open?
2. Can the current page do the task? If yes, use captureScreenshot + findElements + fillInput/clickElement
3. Only use playbooks if you need to navigate to a NEW site from scratch
4. Use findElements or getAccessibilitySnapshot to find interactive elements on current page
5. **SEARCH WORKFLOW** (step-by-step):
   - Step 1: findElements with query: "search box" or "search input"
   - Step 2: fillInput with the search box index and your search query
   - Step 3: findElements with query: "search button" OR pressKey with "Enter"
   - Step 4: After results load, findElements with query: "video" or "link" to find results
   - Step 5: Get the href from the result, then use openTab with that URL
6. **OPENING LINKS**: Use openTab with the href URL, NOT clickElement. clickElement is for buttons/inputs only.
7. Fill ALL form fields before clicking submit/next buttons
8. Ask user for confirmation before submitting forms
9. Store new personal info with storeMemory for future use

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
