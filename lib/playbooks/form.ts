import { type Playbook } from './types'

export const formPlaybook: Playbook = {
  id: 'fill-form',
  description: 'Step-by-step guidance for filling forms on the current page',
  requiredTools: ['captureScreenshot', 'findElements', 'fillInput', 'clickElement', 'getAccessibilitySnapshot', 'scrollDown', 'scrollUp', 'storeMemory'],
  contents: `## Form Filling Workflow

1. **See the page visually**: Call captureScreenshot to see what's on the page
2. **Get form structure**: Call getAccessibilitySnapshot to see all form fields
3. **Check memories**: Look at stored memories for matching data ONLY for fields that exist on the page
   - If memory contains the EXACT VALUE (e.g., "User's email is hello@example.com"), use it
   - If memory only MENTIONS something (e.g., "User received OTP") but NOT the actual value, ASK the user
   - DO NOT ask for information that isn't needed on the current form (e.g., don't ask for phone if there's no phone field)
4. **For EACH field without data**:
   - Ask user in plain text: "What's your [field name]?"
   - STOP COMPLETELY - do not continue, do not make tool calls, do not proceed
   - NEVER invent user responses (NO "User: 'some value'" - that's hallucination!)
   - User will respond in their NEXT message with the actual value
   - After receiving user's response: Call fillInput with the value user provided
   - WAIT for [TOOL RESULT]
   - Call storeMemory to save it
   - WAIT for [TOOL RESULT]
   - Move to next field
5. **After ALL fields are filled**: Click the submit/next button with clickElement

## NEVER DO THESE:
- Don't invent data (like "+15551234567", "test@example.com", "000000", "123456")
- Don't simulate user responses (NO "User: 'Jane Doe'" or "User: '12345'" - that's hallucination!)
- Don't continue after asking a question - STOP and wait for real user input
- Don't fill fields without asking user first (even if memory mentions it without the value)
- Don't assume values: Memory saying "User received OTP" ≠ knowing the actual OTP code - ASK FOR IT
- Don't ask for information that doesn't exist on the form (e.g., if there's only an email field, don't ask for phone number)
- Don't call multiple tools at once - WAIT for each [TOOL RESULT]
- Don't make up JSON responses
- Don't invent tools that don't exist

## Example: Standard Form

captureScreenshot → See the page
→ getAccessibilitySnapshot → See: First Name [14], Last Name [15], Email [16]
→ Check memory: Has "User's name is Jane Smith" → Use Jane for first, Smith for last
→ fillInput[14] "Jane"
→ WAIT for [TOOL RESULT]
→ fillInput[15] "Smith"
→ WAIT for [TOOL RESULT]
→ Check memory: Has "User's email is jane@example.com" → Use it
→ fillInput[16] "jane@example.com"
→ WAIT for [TOOL RESULT]
→ clickElement[19]

## Example: Simple Login (Only fill what's there!)

captureScreenshot → See the login page
→ getAccessibilitySnapshot → See: Email [2], Continue Button [3]
→ Check memory: Has "User's email is jane@example.com"
→ fillInput[2] "jane@example.com"
→ WAIT for [TOOL RESULT]
→ clickElement[3]
→ Done! (Don't ask for phone, password, or anything else not on the form)

## Example: OTP/Password (DON'T HALLUCINATE!)

captureScreenshot → See the OTP page
→ getAccessibilitySnapshot → See: OTP Code [5]
→ Check memory: Has "User received OTP" (but NOT the actual code)
→ MUST ASK: "What's the OTP code you received?"
→ STOP HERE - wait for real user to respond in next message
→ [User responds in next message]: "845721"
→ fillInput[5] "845721"
→ WAIT for [TOOL RESULT]
→ Don't store OTPs (they're temporary)
→ Click submit if needed

## Example: Form with Missing Data (WAIT FOR REAL USER!)

captureScreenshot → See contact form
→ getAccessibilitySnapshot → See: Name [0], Email [1]
→ Check memory: No data found
→ ASK: "What's your full name?"
→ STOP - DO NOT CONTINUE - DO NOT INVENT RESPONSE
→ [In next message, real user responds]: "Alice Johnson"
→ storeMemory "User's name is Alice Johnson"
→ fillInput[0] "Alice Johnson"
→ ASK: "What's your email?"
→ STOP - WAIT FOR REAL USER
→ [In next message, real user responds]: "alice@example.com"
→ storeMemory "User's email is alice@example.com"
→ fillInput[1] "alice@example.com"
→ Done!`
}
