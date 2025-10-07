// Tools that must execute in UI context (require user gesture)
// Automatically loads ALL tools with requiresUserGesture: true from registry
import type { ToolCall } from './tools'
import { getUITools } from './tool-registry'
import { WriterAPIUnavailableError } from './errors'

// Build handler map automatically from imports
const TOOL_IMPLEMENTATIONS: Record<string, (params: any) => Promise<any>> = {
  // Summarizer API tool for current page
  summarizePage: async (params: any) => {
    const { type = 'key-points', length = 'medium' } = params
    
    // Check if Summarizer API is available
    if (!('Summarizer' in self)) {
      throw new WriterAPIUnavailableError('Summarizer API is not available in this browser')
    }
    
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id || !tab.url) {
        throw new Error('No active tab found')
      }

      // Skip certain URLs
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('about:')) {
        throw new Error('Cannot summarize this type of page')
      }

      // Inject Readability.js
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['assets/Readability.js']
      })

      // Extract content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            const documentClone = document.cloneNode(true) as Document
            // @ts-ignore
            const reader = new Readability(documentClone, {
              keepClasses: false,
              charThreshold: 100
            })
            const article = reader.parse()
            
            if (!article) {
              const mainElement = document.querySelector('main, article, [role="main"], #content')
              const content = mainElement 
                ? (mainElement as HTMLElement).innerText 
                : document.body.innerText
              
              if (!content || content.length < 100) {
                return { success: false, error: 'Insufficient content' }
              }
              
              return {
                success: true,
                title: document.title,
                content: content.replace(/\s+/g, ' ').trim()
              }
            }
            
            return {
              success: true,
              title: article.title || document.title,
              content: article.textContent.replace(/\s+/g, ' ').trim()
            }
          } catch (error: any) {
            return { success: false, error: error.message }
          }
        }
      })

      const extracted = results[0].result as any
      if (!extracted.success || !extracted.content) {
        throw new Error(extracted.error || 'Failed to extract page content')
      }

      // Check Summarizer availability
      const availability = await (self as any).Summarizer.availability()
      if (availability === 'unavailable') {
        throw new WriterAPIUnavailableError('Summarizer model is not available')
      }

      // Create summarizer
      let summarizer
      if (availability === 'available') {
        summarizer = await (self as any).Summarizer.create({
          type,
          format: 'plain-text',
          length
        })
      } else {
        summarizer = await (self as any).Summarizer.create({
          type,
          format: 'plain-text',
          length,
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Summarizer downloading: ${(e.loaded * 100).toFixed(0)}%`)
            })
          }
        })
      }

      // Summarize the content
      const summary = await summarizer.summarize(extracted.content)

      // Clean up
      summarizer.destroy()

      return `Summary of "${extracted.title}":\n\n${summary}`
    } catch (error: any) {
      console.error('Summarizer API error:', error)
      if (error instanceof WriterAPIUnavailableError) {
        throw error
      }
      throw new Error(`Summarizer API error: ${error.message}`)
    }
  },
  
  // Translator API tool
  translateText: async (params: any) => {
    const { text, sourceLanguage, targetLanguage } = params
    
    if (!text) {
      throw new Error('Text parameter is required')
    }
    if (!sourceLanguage || !targetLanguage) {
      throw new Error('Both sourceLanguage and targetLanguage are required')
    }
    
    // Check if Translator API is available
    if (!('Translator' in self)) {
      throw new WriterAPIUnavailableError('Translator API is not available in this browser')
    }
    
    try {
      // Check availability for this language pair
      const availability = await (self as any).Translator.availability({
        sourceLanguage,
        targetLanguage
      })
      
      if (availability === 'no') {
        throw new WriterAPIUnavailableError(`Translation from ${sourceLanguage} to ${targetLanguage} is not supported`)
      }
      
      // Create translator
      let translator
      if (availability === 'readily') {
        translator = await (self as any).Translator.create({
          sourceLanguage,
          targetLanguage
        })
      } else {
        // Model needs to be downloaded
        translator = await (self as any).Translator.create({
          sourceLanguage,
          targetLanguage,
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Translator downloading: ${(e.loaded * 100).toFixed(0)}%`)
            })
          }
        })
      }
      
      // Translate the text
      const result = await translator.translate(text)
      
      // Clean up
      translator.destroy()
      
      return result
    } catch (error: any) {
      console.error('Translator API error:', error)
      if (error instanceof WriterAPIUnavailableError) {
        throw error
      }
      throw new Error(`Translator API error: ${error.message}`)
    }
  },
  
  // Language Detector API tool
  detectLanguage: async (params: any) => {
    const { text } = params
    
    if (!text) {
      throw new Error('Text parameter is required')
    }
    
    // Check if Language Detector API is available
    if (!('LanguageDetector' in self)) {
      throw new WriterAPIUnavailableError('Language Detector API is not available in this browser')
    }
    
    try {
      // Check availability
      const availability = await (self as any).LanguageDetector.availability()
      
      if (availability === 'no') {
        throw new WriterAPIUnavailableError('Language Detector model is not available')
      }
      
      // Create detector
      let detector
      if (availability === 'readily') {
        detector = await (self as any).LanguageDetector.create()
      } else {
        // Model needs to be downloaded
        detector = await (self as any).LanguageDetector.create({
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Language Detector downloading: ${(e.loaded * 100).toFixed(0)}%`)
            })
          }
        })
      }
      
      // Detect language
      const results = await detector.detect(text)
      
      // Clean up
      detector.destroy()
      
      // Return top result with all candidates
      if (results && results.length > 0) {
        const topResult = results[0]
        return {
          language: topResult.detectedLanguage,
          confidence: topResult.confidence,
          allResults: results.slice(0, 5).map((r: any) => ({
            language: r.detectedLanguage,
            confidence: r.confidence
          }))
        }
      }
      
      throw new Error('No language detected')
    } catch (error: any) {
      console.error('Language Detector API error:', error)
      if (error instanceof WriterAPIUnavailableError) {
        throw error
      }
      throw new Error(`Language Detector API error: ${error.message}`)
    }
  },
  
  // Writer API tool
  writeContent: async (params: any) => {
    const { task, context, tone = 'neutral', length = 'medium', format = 'plain-text' } = params
    
    // Check if Writer API is available
    if (!('Writer' in self)) {
      throw new WriterAPIUnavailableError('Writer API is not available in this browser')
    }
    
    try {
      // Check availability
      const availability = await (self as any).Writer.availability()
      
      if (availability === 'unavailable') {
        throw new WriterAPIUnavailableError('Writer API model is not available')
      }
      
      // Create writer with options
      const options: any = {
        tone,
        length,
        format
      }
      
      let writer
      if (availability === 'available') {
        // Writer API can be used immediately
        writer = await (self as any).Writer.create(options)
      } else {
        // Model needs to be downloaded
        writer = await (self as any).Writer.create({
          ...options,
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Writer API downloading: ${(e.loaded * 100).toFixed(0)}%`)
            })
          }
        })
      }
      
      // Generate content (non-streaming for now)
      const result = await writer.write(task, context ? { context } : undefined)
      
      // Clean up
      writer.destroy()
      
      return result
    } catch (error: any) {
      console.error('Writer API error:', error)
      if (error instanceof WriterAPIUnavailableError) {
        throw error
      }
      throw new Error(`Writer API error: ${error.message}`)
    }
  }
}

export async function executeUITool(toolCall: ToolCall): Promise<any> {
  console.log('=== EXECUTING IN UI CONTEXT ===')
  console.log('Has user activation:', (navigator as any).userActivation?.isActive)
  console.log('Window object:', typeof window)
  console.log('Chrome runtime:', chrome.runtime.id)
  console.log('Tool:', toolCall.function)
  console.log('================================')
  
  const handler = TOOL_IMPLEMENTATIONS[toolCall.function]
  
  if (!handler) {
    return { success: false, error: `UI tool ${toolCall.function} not implemented in ui-tools.ts` }
  }
  
  try {
    const result = await handler(toolCall.arguments)
    console.log('UI tool result:', result)
    
    // Wrap raw results in expected format
    return { 
      success: true, 
      result: result 
    }
  } catch (error: any) {
    console.error('UI tool error:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

// Validate at runtime that all UI tools from registry are implemented
export function validateUITools(): void {
  const uiToolSpecs = getUITools()
  const missing = uiToolSpecs.filter(spec => !TOOL_IMPLEMENTATIONS[spec.name])
  
  if (missing.length > 0) {
    console.error('❌ Missing UI tool implementations:', missing.map(t => t.name))
    console.error('Add these to ui-tools.ts TOOL_IMPLEMENTATIONS')
  } else {
    console.log('✅ All UI tools implemented:', uiToolSpecs.map(t => t.name))
  }
}
