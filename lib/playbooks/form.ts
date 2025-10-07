import { type Playbook } from './types'

export const formPlaybook: Playbook = {
  id: 'fill-form',
  description: 'How to fill out web forms',
  requiredTools: ['captureScreenshot', 'findElements', 'fillInput', 'clickElement', 'getAccessibilitySnapshot', 'scrollDown', 'scrollUp'],
  contents: `## Form Filling Workflow

When user says "fill this form" or "fill out the form":

Step 1: Call captureScreenshot to see the current form → Wait for result
Step 2: If you can't see the submit button or the form appears cut off:
   - Call scrollDown to scroll down the page → Wait for result
   - Call captureScreenshot again → Wait for result
   - Repeat scrolling and screenshots until you see the full form including submit button
Step 3: Call getAccessibilitySnapshot to identify all form fields → Wait for result
Step 4: Analyze the form structure and identify:
   - Text inputs (name, email, address, phone, etc.)
   - Dropdowns/select elements
   - Checkboxes and radio buttons
   - Textareas
   - Submit button
Step 5: Ask the user for the information needed to fill each field (if not provided)
Step 6: For each field, call fillInput with the appropriate index and value → Wait for result after each
Step 7: If you need to scroll to see more fields, use scrollDown then captureScreenshot
Step 8: For dropdowns, use clickElement to select options
Step 9: For checkboxes/radio buttons, use clickElement to toggle/select
Step 10: After all fields are filled, scroll to find the submit button if needed
Step 11: findElements with query: "submit" → Wait for result
Step 12: Ask user for confirmation before submitting
Step 13: If confirmed, clickElement on the submit button → Wait for result

EXAMPLE for a contact form:
<function_call>{"function": "captureScreenshot", "arguments": {}}</function_call>
[Wait for TOOL RESULT]
<function_call>{"function": "getAccessibilitySnapshot", "arguments": {}}</function_call>
[Wait for TOOL RESULT showing fields like:
  [2] TEXTBOX: Name
  [4] TEXTBOX: Email
  [6] TEXTBOX: Message
  [8] BUTTON: Submit
]
[Ask user: "I found a form with Name, Email, and Message fields. What would you like me to fill in?"]
[User provides: "John Doe, john@example.com, Hello there"]
<function_call>{"function": "fillInput", "arguments": {"index": 2, "value": "John Doe"}}</function_call>
[Wait for TOOL RESULT]
<function_call>{"function": "fillInput", "arguments": {"index": 4, "value": "john@example.com"}}</function_call>
[Wait for TOOL RESULT]
<function_call>{"function": "fillInput", "arguments": {"index": 6, "value": "Hello there"}}</function_call>
[Wait for TOOL RESULT]
[Ask: "All fields filled. Should I submit the form?"]
[If user confirms]
<function_call>{"function": "clickElement", "arguments": {"index": 8}}</function_call>

CRITICAL:
- If the form is long and you can't see all fields, use scrollDown then captureScreenshot to see more
- Scroll and screenshot as many times as needed to see the entire form
- Use getAccessibilitySnapshot ONCE after you've seen the full form
- After getting the snapshot, IMMEDIATELY analyze it and ASK the user for values
- ASK for field values if user didn't provide them - don't keep gathering info
- Fill fields ONE AT A TIME, waiting for each result
- If a field is not visible, use scrollDown or scrollUp to bring it into view before filling
- ALWAYS ask for confirmation before submitting
- Use descriptive field names when asking user for values
- Handle different input types appropriately (text, select, checkbox, radio)
- If getAccessibilitySnapshot returns too many elements, use findElements with specific queries like "email input", "name field", etc.
- NEVER call think tool after getting snapshot - just proceed to ask user or fill fields`
}
