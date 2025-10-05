import type { ToolSpec } from '../../lib/tool-registry'
import { generateEmbedding, cosineSimilarity } from '../../lib/embeddings'

async function getAccessibilitySnapshot(params: any) {
  try {
    const { query } = params // Optional semantic search query
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Extract interactive elements with accessibility info
        const elements: any[] = []
        let index = 0
        
        const interactiveSelectors = [
          'button',
          'a[href]',
          'input',
          'textarea',
          'select',
          '[role="button"]',
          '[role="link"]',
          '[role="textbox"]',
          '[tabindex]:not([tabindex="-1"])',
          '[onclick]'
        ]
        
        const allElements = document.querySelectorAll(interactiveSelectors.join(','))
        
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement
          
          // Skip hidden or non-visible elements
          const style = window.getComputedStyle(htmlEl)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return
          }
          
          // Skip elements with zero size (dummy/hidden elements)
          const rect = htmlEl.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) {
            return
          }
          
          // Skip elements far offscreen (more than 10000px away)
          if (rect.top < -10000 || rect.left < -10000) {
            return
          }
          
          // Compute accessible name
          let accessibleName = ''
          if (htmlEl.hasAttribute('aria-label')) {
            accessibleName = htmlEl.getAttribute('aria-label') || ''
          } else if (htmlEl.hasAttribute('aria-labelledby')) {
            const labelId = htmlEl.getAttribute('aria-labelledby')
            const labelEl = labelId ? document.getElementById(labelId) : null
            accessibleName = labelEl?.textContent?.trim() || ''
          } else if (htmlEl instanceof HTMLInputElement || htmlEl instanceof HTMLTextAreaElement) {
            // For inputs, look for associated label
            const label = htmlEl.labels?.[0]
            accessibleName = label?.textContent?.trim() || htmlEl.placeholder || ''
          } else {
            accessibleName = htmlEl.textContent?.trim() || ''
          }
          
          // Get role
          let role = htmlEl.getAttribute('role') || ''
          if (!role) {
            const tagName = htmlEl.tagName.toLowerCase()
            if (tagName === 'button') role = 'button'
            else if (tagName === 'a') role = 'link'
            else if (tagName === 'input') {
              const type = (htmlEl as HTMLInputElement).type
              role = type === 'submit' ? 'button' : 'textbox'
            }
            else if (tagName === 'textarea') role = 'textbox'
            else if (tagName === 'select') role = 'combobox'
          }
          
          // Create unique selector
          const dataAttr = `data-marionette-${index}`
          htmlEl.setAttribute(dataAttr, 'true')
          
          // Truncate long text
          const displayName = accessibleName.length > 80 
            ? accessibleName.substring(0, 77) + '...'
            : accessibleName
          
          elements.push({
            index,
            role,
            name: displayName,
            tagName: htmlEl.tagName.toLowerCase(),
            selector: `[${dataAttr}]`,
            type: htmlEl instanceof HTMLInputElement ? htmlEl.type : null,
            href: htmlEl instanceof HTMLAnchorElement ? htmlEl.href : null,
            disabled: htmlEl.hasAttribute('disabled')
          })
          
          index++
        })
        
        return elements
      }
    })

    const elements = result[0]?.result || []
    
    if (elements.length === 0) {
      return {
        success: true,
        result: 'No interactive elements found on this page.'
      }
    }
    
    let filteredElements = elements
    let wasFiltered = false
    
    // Use semantic filtering if page is complex AND query is provided
    const SEMANTIC_FILTER_THRESHOLD = 50
    if (elements.length > SEMANTIC_FILTER_THRESHOLD && query && typeof query === 'string') {
      try {
        console.log('[getAccessibilitySnapshot] Page has', elements.length, 'elements, using semantic filtering...')
        console.log('[getAccessibilitySnapshot] Query:', query)
        
        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query)
        
        // Generate embeddings for each element (combine role + name for context)
        const elementsWithSimilarity = await Promise.all(
          elements.map(async (el: any) => {
            const elementText = `${el.role} ${el.name}`.trim()
            const embedding = await generateEmbedding(elementText)
            const similarity = cosineSimilarity(queryEmbedding, embedding)
            return { ...el, similarity }
          })
        )
        
        // Sort by similarity and take top 10
        elementsWithSimilarity.sort((a, b) => b.similarity - a.similarity)
        filteredElements = elementsWithSimilarity.slice(0, 10)
        wasFiltered = true
        
        console.log('[getAccessibilitySnapshot] Filtered to top 10 elements')
        console.log('[getAccessibilitySnapshot] Top similarities:', 
          filteredElements.slice(0, 3).map(e => `${(e.similarity * 100).toFixed(0)}%`).join(', '))
      } catch (embError) {
        console.warn('[getAccessibilitySnapshot] Semantic filtering failed, showing all:', embError)
        // Fall through to show warning about too many elements
      }
    }
    
    // Check if page is still too complex after filtering
    const MAX_ELEMENTS_TO_SHOW = 100
    if (filteredElements.length > MAX_ELEMENTS_TO_SHOW) {
      return {
        success: true,
        result: `TOO MANY ELEMENTS: Found ${elements.length} interactive elements.
This page is too complex for getAccessibilitySnapshot.
Try using captureScreenshot, or call getAccessibilitySnapshot with a "query" parameter for semantic filtering.`
      }
    }
    
    // Format as readable text
    let output = wasFiltered 
      ? `Found ${elements.length} elements, filtered to top ${filteredElements.length} most relevant to "${query}":\n\n`
      : `Found ${filteredElements.length} interactive elements:\n\n`
    
    filteredElements.forEach((el: any) => {
      const disabled = el.disabled ? ' [DISABLED]' : ''
      const type = el.type ? ` (type: ${el.type})` : ''
      const href = el.href ? ` (${el.href})` : ''
      const similarity = el.similarity ? ` [${(el.similarity * 100).toFixed(0)}% match]` : ''
      
      output += `[${el.index}] ${el.role.toUpperCase()}: "${el.name}"${type}${href}${disabled}${similarity}\n`
    })
    
    return { 
      success: true, 
      result: output
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'getAccessibilitySnapshot',
  description: 'Gets a list of all interactive elements on the current page with their accessibility information. For complex pages with 50+ elements, provide a query parameter to use AI-powered semantic filtering.',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Optional: Semantic search query to filter elements on complex pages (e.g., "submit button", "login form", "navigation menu")',
      required: false
    }
  ],
  spokenLine: "Let me see what's on this page",
  examples: [
    'User: "what can I click on this page?" → getAccessibilitySnapshot',
    'User: "show me the buttons" → getAccessibilitySnapshot',
    'User: "list all links" → getAccessibilitySnapshot',
    'Complex page with many elements → getAccessibilitySnapshot with query: "submit button"'
  ]
}

export default getAccessibilitySnapshot
