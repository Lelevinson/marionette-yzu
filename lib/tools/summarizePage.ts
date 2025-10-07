// summarizePage tool - Uses Summarizer API to summarize the current page
import type { PlasmoMessaging } from "@plasmohq/messaging"
import type { ToolSpec } from '../tool-registry'

// This handler runs in background, but actual implementation is in ui-tools.ts
// because Summarizer API requires UI context with user gesture
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    console.log("summarizePage handler called (should be delegated to UI context)")
    
    // This should not be called directly - the tool should be executed via executeUITool
    // in the UI context where Summarizer API is available
    res.send({ 
      error: 'summarizePage must be executed in UI context with user gesture' 
    })
  } catch (error: any) {
    console.error("Error in summarizePage handler:", error)
    res.send({ error: error.message })
  }
}

export const spec: ToolSpec = {
  name: 'summarizePage',
  description: 'Summarizes the content of the current web page using Chrome\'s built-in Summarizer API. Returns a concise summary of the main points.',
  parameters: [
    {
      name: 'type',
      type: 'string',
      description: 'Summary type: "key-points" for bullet points, "tl;dr" for brief summary, "teaser" for headline-style, or "headline" for title (default: "key-points")',
      required: false
    },
    {
      name: 'length',
      type: 'string',
      description: 'Summary length: "short", "medium", or "long" (default: "medium")',
      required: false
    }
  ],
  examples: [
    'User: "summarize this page" → summarizePage',
    'User: "what are the key points on this page?" → summarizePage',
    'User: "give me a tl;dr of this article" → summarizePage with type="tl;dr"',
    'User: "what\'s this page about?" → summarizePage',
    'User: "give me a brief summary" → summarizePage with length="short"'
  ],
  spokenLine: 'Summarizing page',
  requiresUserGesture: true  // Requires UI context for Summarizer API access
}

export default handler
