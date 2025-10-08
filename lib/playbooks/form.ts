import { type Playbook } from './types'

export const formPlaybook: Playbook = {
  id: 'fill-form',
  description: 'How to fill out web forms',
  requiredTools: ['findElements', 'fillInput', 'clickElement', 'getAccessibilitySnapshot', 'scrollDown', 'scrollUp', 'storeMemory'],
  contents: `## Form Filling Workflow

1. **Get form structure**: Call getAccessibilitySnapshot to see all form fields
2. **Check memories**: Look at stored memories for matching data (name, email, phone, company, etc.)
3. **For EACH field without data**:
   - Ask user in plain text: "What's your [field name]?"
   - WAIT for user to respond
   - Call fillInput with the value user provided
   - WAIT for [TOOL RESULT]
   - Call storeMemory to save it
   - WAIT for [TOOL RESULT]
   - Move to next field
4. **After ALL fields are filled**: Click the submit/next button with clickElement

## NEVER DO THESE:
- Don't invent data (like "+15551234567" or "test@example.com")
- Don't fill fields without asking user first
- Don't call multiple tools at once - WAIT for each [TOOL RESULT]
- Don't make up JSON responses
- Don't invent tools that don't exist

## Example

getAccessibilitySnapshot → See: First Name [14], Last Name [15], Email [16]
→ Ask: "What's your first name?"
→ WAIT for user response
→ User: "Jane"
→ fillInput[14] "Jane"
→ WAIT for [TOOL RESULT]
→ storeMemory "User's first name is Jane"
→ WAIT for [TOOL RESULT]
→ Ask: "What's your last name?"
→ WAIT for user response
→ User: "Smith"
→ fillInput[15] "Smith"
→ WAIT for [TOOL RESULT]
→ storeMemory "User's last name is Smith"
→ WAIT for [TOOL RESULT]
→ Ask: "What's your email?"
→ WAIT for user response
→ User: "jane@example.com"
→ fillInput[16] "jane@example.com"
→ WAIT for [TOOL RESULT]
→ storeMemory "User's email is jane@example.com"
→ WAIT for [TOOL RESULT]
→ clickElement[19]`
}
