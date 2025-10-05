import { type Playbook } from './types'

export const searchPlaybook: Playbook = {
  id: 'google-search',
  description: 'How to search for information using Google',
  requiredTools: ['openTab', 'findElements', 'fillInput', 'clickElement', 'captureScreenshot'],
  contents: `## Google Search Workflow

NOW EXECUTE THESE STEPS ONE BY ONE:

Step 1: Call openTab with url: "https://www.google.com" → Wait for result
Step 2: Call findElements with query: "Search" (with capital S) → Wait for result, note the index
Step 3: Call fillInput with the index from step 2, value: user's search query → Wait for result
Step 4: Call findElements with query: "Google Search" → Wait for result, note the index
Step 5: Call clickElement with the index from step 4 → Wait for result
Step 6: Call captureScreenshot → Wait for result
Step 7: Describe the weather from the screenshot → STOP

IMPORTANT: If Step 2 returns "No elements found", try query: "textarea" or "combobox" instead.

EXAMPLE for "weather in tokyo":
<function_call>{"function": "openTab", "arguments": {"url": "https://www.google.com"}}</function_call>
[Wait for TOOL RESULT]
<function_call>{"function": "findElements", "arguments": {"query": "Search"}}</function_call>
[Wait for TOOL RESULT showing index like [6]]
<function_call>{"function": "fillInput", "arguments": {"index": 6, "value": "weather in tokyo"}}</function_call>
[If no elements found, try: {"function": "findElements", "arguments": {"query": "textarea"}}]
[Continue...]

CRITICAL:
- Call tools ONE AT A TIME, not all at once
- Use ACTUAL index numbers from findElements results
- After describing results, STOP!`
}
