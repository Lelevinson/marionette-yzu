import { type Playbook } from './types'

export const emailPlaybook: Playbook = {
  id: 'send-email',
  description: 'Opens Gmail to send email - ONLY use if not already on Gmail',
  requiredTools: ['openTab', 'findElements', 'fillInput', 'clickElement', 'writeContent'],
  contents: `## Email Workflow

When user says "send email to X":

Step 1: openTab with url: "https://mail.google.com"
Step 2: findElements with query: "compose"
Step 3: clickElement with index from step 2
Step 4: findElements with query: "To"
Step 5: fillInput with recipient email
Step 6: Use writeContent to draft the email content
Step 7: Extract subject (first line after "Subject:") and body from writeContent result
Step 8: findElements with query: "subject"
Step 9: fillInput with subject from writeContent
Step 10: findElements with query: "message body"
Step 11: fillInput with body from writeContent
Step 12: findElements with query: "send"
Step 13: clickElement to send

CRITICAL:
- Open Gmail compose window FIRST, fill recipient
- THEN use writeContent to draft the email
- Extract subject and body from writeContent result
- Fill subject and body fields in Gmail
- Then send`
}
