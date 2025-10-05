import React, { useState, useRef, useEffect } from "react"
import { Copy, RotateCcw, Square, ArrowLeft, Play, ChevronDown, ChevronRight } from "lucide-react"
import { parseToolCall, executeTool } from "../lib/tools"
import { executeUITool } from "../lib/ui-tools"
import { type Message } from "../lib/messages"
import { useChatContext } from "../lib/chat-context"
import { getToolNames, TOOL_REGISTRY, getToolSpec } from "../lib/tool-registry"
import { testEmbeddings, testSimilarity } from "../lib/transformers-test"
import { searchVault, getVaultStats, clearVault } from "../lib/vault"

interface DebugScreenProps {
  onNavigateToMain: () => void
  fullHeight?: boolean
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
}

const CollapsibleSection = ({ title, children, defaultExpanded = false }: CollapsibleSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-900 transition-colors"
      >
        <div className="font-mono text-xs text-gray-500">{title}</div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

const ToolTester = () => {
  const [selectedTool, setSelectedTool] = useState("")
  const [params, setParams] = useState("{}")
  const [result, setResult] = useState<any>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const toolNames = getToolNames()
  const selectedToolSpec = TOOL_REGISTRY.find(t => t.name === selectedTool)

  const handleExecute = async () => {
    if (!selectedTool) return

    setIsExecuting(true)
    setResult(null)

    try {
      const parsedParams = JSON.parse(params)
      const toolSpec = getToolSpec(selectedTool)
      
      // Check if tool requires user gesture (UI context)
      let toolResult
      if (toolSpec?.requiresUserGesture) {
        console.log('[DEBUG] Executing UI tool:', selectedTool)
        toolResult = await executeUITool({ function: selectedTool, arguments: parsedParams })
      } else {
        console.log('[DEBUG] Executing background tool:', selectedTool)
        toolResult = await executeTool({ function: selectedTool, arguments: parsedParams })
      }
      
      setResult(toolResult)
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleToolChange = (toolName: string) => {
    setSelectedTool(toolName)
    const spec = TOOL_REGISTRY.find(t => t.name === toolName)
    if (spec) {
      const defaultParams: any = {}
      spec.parameters.forEach(p => {
        if (p.required) {
          defaultParams[p.name] = p.type === 'number' ? 0 : ""
        }
      })
      setParams(JSON.stringify(defaultParams, null, 2))
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <select
          value={selectedTool}
          onChange={(e) => handleToolChange(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-gray-500"
        >
          <option value="">select tool</option>
          {toolNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        
        <button
          onClick={handleExecute}
          disabled={!selectedTool || isExecuting}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          run
        </button>
      </div>

      {selectedToolSpec && (
        <div className="text-xs text-gray-500 font-mono">
          {selectedToolSpec.parameters.map(p => (
            <div key={p.name} className="text-[10px]">
              <span className={p.required ? "text-gray-400" : "text-gray-600"}>
                {p.name}: {p.type} {p.required && "*"}
              </span>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={params}
        onChange={(e) => setParams(e.target.value)}
        placeholder='{"param": "value"}'
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-gray-500 h-20 resize-none"
      />

      {isExecuting && (
        <div className="text-xs text-cyan-400 font-mono">executing...</div>
      )}

      {result && (
        <div className="bg-gray-900 border border-gray-700 rounded p-2">
          <div className={`text-xs font-mono ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? 'SUCCESS' : 'ERROR'}
          </div>
          <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap mt-1 max-h-40 overflow-y-auto">
            {result.success ? result.result : result.error}
          </div>
        </div>
      )}
    </>
  )
}

const TransformersTest = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runEmbeddingTest = async () => {
    setIsLoading(true)
    setResult(null)
    
    const res = await testEmbeddings("Hello world, this is a test!")
    setResult(res)
    setIsLoading(false)
  }

  const runSimilarityTest = async () => {
    setIsLoading(true)
    setResult(null)
    
    const res = await testSimilarity(
      "I love programming",
      "I enjoy coding"
    )
    setResult(res)
    setIsLoading(false)
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={runEmbeddingTest}
          disabled={isLoading}
          className="px-3 py-1 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          Test Embeddings
        </button>
        
        <button
          onClick={runSimilarityTest}
          disabled={isLoading}
          className="px-3 py-1 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono flex items-center gap-1"
        >
          <Play className="w-3 h-3" />
          Test Similarity
        </button>
      </div>

      {isLoading && (
        <div className="text-xs text-purple-400 font-mono animate-pulse">
          Loading model and generating embeddings... (first time may take 10-30s to download ~23MB model)
        </div>
      )}

      {result && (
        <div className="bg-gray-900 border border-gray-700 rounded p-2">
          <div className={`text-xs font-mono ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? 'SUCCESS ✓' : 'ERROR ✗'}
          </div>
          {result.success && result.dimensions && (
            <div className="text-xs text-gray-300 font-mono mt-1">
              <div>Dimensions: {result.dimensions}</div>
              {result.similarity !== undefined && (
                <div className="mt-1">
                  <div>Text 1: {result.text1}</div>
                  <div>Text 2: {result.text2}</div>
                  <div className="text-purple-400 font-bold">Similarity: {(result.similarity * 100).toFixed(2)}%</div>
                </div>
              )}
              {result.embedding && (
                <div className="mt-1 text-[10px] text-gray-500">
                  First 10 values: [{result.embedding.slice(0, 10).map((v: number) => v.toFixed(4)).join(', ')}]
                </div>
              )}
            </div>
          )}
          {result.error && (
            <div className="text-xs text-red-300 font-mono mt-1">{result.error}</div>
          )}
        </div>
      )}
    </>
  )
}

const VaultDebugger = () => {
  const [stats, setStats] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const vaultStats = await getVaultStats()
      setStats(vaultStats)
    } catch (error: any) {
      setStats({ error: error.message })
    }
    setIsLoading(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsLoading(true)
    setSearchResults(null)
    
    try {
      const results = await searchVault(searchQuery, 5, 0.2) // 20% threshold
      setSearchResults(results)
    } catch (error: any) {
      setSearchResults({ error: error.message })
    }
    
    setIsLoading(false)
  }

  const handleCapture = async () => {
    setIsLoading(true)
    try {
      // Execute captureCurrentPage tool
      const result = await executeTool({ 
        function: 'captureCurrentPage', 
        arguments: {} 
      })
      
      if (result.success) {
        // Reload stats after capture
        await loadStats()
        alert('Page captured! Check stats below.')
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
    setIsLoading(false)
  }

  const handleClearVault = async () => {
    if (!confirm('Are you sure you want to clear the entire vault? This cannot be undone.')) {
      return
    }
    
    setIsLoading(true)
    try {
      await clearVault()
      await loadStats()
      setSearchResults(null)
      alert('Vault cleared successfully!')
    } catch (error: any) {
      alert(`Error clearing vault: ${error.message}`)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <>
      {/* Stats Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-gray-400">Statistics:</div>
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-[10px] font-mono"
          >
            Refresh
          </button>
          <button
            onClick={handleClearVault}
            disabled={isLoading || !stats || stats.count === 0}
            className="px-2 py-1 bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] font-mono"
          >
            Clear Vault
          </button>
        </div>
        
        {stats && (
          <div className="bg-gray-900 border border-gray-700 rounded p-2 text-[10px] font-mono">
            {stats.error ? (
              <div className="text-red-400">{stats.error}</div>
            ) : (
              <div className="text-gray-300">
                <div>📊 Total Pages: {stats.count}</div>
                {stats.count > 0 && (
                  <>
                    <div className="mt-1">📅 Newest: {new Date(stats.newestEntry).toLocaleString()}</div>
                    <div className="text-gray-500 text-[9px] mt-1">
                      Domains: {Object.keys(stats.domains).slice(0, 3).join(', ')}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capture Button */}
      <div>
        <button
          onClick={handleCapture}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-green-900 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono flex items-center justify-center gap-2"
        >
          <Play className="w-3 h-3" />
          Capture Current Page
        </button>
      </div>

      {/* Search Section */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-gray-400">Search Vault:</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., AI articles"
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-gray-500"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="px-3 py-1 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-mono flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            Search
          </button>
        </div>

        {isLoading && (
          <div className="text-xs text-blue-400 font-mono animate-pulse">
            Searching...
          </div>
        )}

        {searchResults && (
          <div className="bg-gray-900 border border-gray-700 rounded p-2 max-h-60 overflow-y-auto">
            {searchResults.error ? (
              <div className="text-xs text-red-400 font-mono">{searchResults.error}</div>
            ) : searchResults.length === 0 ? (
              <div className="text-xs text-gray-500 font-mono">No results found</div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((page: any, i: number) => (
                  <div key={page.id} className="border-b border-gray-800 last:border-0 pb-2 last:pb-0">
                    <div className="text-xs font-mono text-gray-300">
                      [{i + 1}] {page.title}
                    </div>
                    <div className="text-[10px] text-purple-400 font-mono">
                      {(page.similarity * 100).toFixed(0)}% match • {page.domain}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {page.excerpt}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono mt-1 truncate">
                      {page.url}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export const DebugScreen = ({ onNavigateToMain, fullHeight = false }: DebugScreenProps) => {
  const { state, sendMessage, resetChat, interruptChat, copyContext } = useChatContext()
  const [input, setInput] = useState("")
  const [copyFeedback, setCopyFeedback] = useState("")
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.isWaitingForFirstChunk])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || state.isProcessing) return

    const userInput = input.trim()
    setInput("")
    await sendMessage(userInput)
  }

  const handleReset = () => {
    resetChat()
    setCopyFeedback("Reset complete")
    setTimeout(() => setCopyFeedback(""), 2000)
  }

  const handleInterrupt = () => {
    interruptChat()
  }

  const handleCopyContext = async () => {
    try {
      const contextText = await copyContext()
      await navigator.clipboard.writeText(contextText)
      setCopyFeedback("Context copied")
      setTimeout(() => setCopyFeedback(""), 2000)
    } catch (error) {
      setCopyFeedback("Copy failed")
      setTimeout(() => setCopyFeedback(""), 2000)
    }
  }


  const renderMessage = (message: Message) => {
    const toolCall = parseToolCall(message.content)
    
    // Check if it's a tool result message
    const isToolResult = message.content.startsWith('[TOOL RESULT]')
    
    if (toolCall) {
      const textBeforeToolCall = message.content.split('<function_call>')[0].trim()
      
      return (
        <div key={message.id} className="mb-2 font-mono text-xs">
          <div className="text-gray-500 mb-1">{message.role.toUpperCase()}</div>
          {textBeforeToolCall && (
            <div className="text-gray-200 whitespace-pre-wrap mb-2">{textBeforeToolCall}</div>
          )}
          <div className="text-gray-500 mb-1">TOOL_CALL</div>
          <div className="bg-gray-900 p-2 rounded border border-gray-700">
            <div className="text-gray-300">{toolCall.function}</div>
            {Object.keys(toolCall.arguments).length > 0 && (
              <div className="text-gray-400 mt-1 text-[10px]">
                {Object.entries(toolCall.arguments).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{' '}
                    <span className="text-gray-300">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {message.contextCount !== undefined && (
            <div className="text-gray-600 text-[10px] mt-1">
              CONTEXT: {message.contextCount}/9216 tokens
            </div>
          )}
        </div>
      )
    }
    
    if (isToolResult) {
      const resultContent = message.content.replace('[TOOL RESULT]\n', '')
      
      // Check if it's a screenshot
      const isScreenshot = resultContent.startsWith('data:image/')
      
      // Check if it's audio
      const isAudio = resultContent.startsWith('data:audio/')
      
      if (isScreenshot) {
        return (
          <div key={message.id} className="mb-2 font-mono text-xs">
            <div className="text-blue-400 mb-1">TOOL RESULT</div>
            <div className="bg-blue-950 p-2 rounded border border-blue-800">
              <img src={resultContent} alt="Screenshot" className="w-full rounded" />
            </div>
          </div>
        )
      }
      
      if (isAudio) {
        return (
          <div key={message.id} className="mb-2 font-mono text-xs">
            <div className="text-blue-400 mb-1">TOOL RESULT</div>
            <div className="bg-blue-950 p-2 rounded border border-blue-800">
              <audio src={resultContent} controls className="w-full" />
            </div>
          </div>
        )
      }
      
      return (
        <div key={message.id} className="mb-2 font-mono text-xs">
          <div className="text-blue-400 mb-1">TOOL RESULT</div>
          <div className="bg-blue-950 p-2 rounded border border-blue-800 text-blue-200 whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto">
            {resultContent}
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className="mb-2 font-mono text-xs">
        <div className="text-gray-500 mb-1">{message.role.toUpperCase()}</div>
        <div className="text-gray-200 whitespace-pre-wrap">{message.content}</div>
        {message.role === 'assistant' && message.contextCount !== undefined && (
          <div className="text-gray-600 text-[10px] mt-1">
            CONTEXT: {message.contextCount}/9216 tokens
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="w-full  bg-black text-white flex flex-col" 
      style={fullHeight ? { height: '100vh' } : { minHeight: '500px', maxHeight: '600px' }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToMain}
            className="p-1 hover:bg-gray-800 rounded"
            title="Back to main"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="font-mono text-sm">DEBUG_CHAT</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyContext}
            className="p-1 hover:bg-gray-800 rounded"
            title="Copy context"
          >
            <Copy className="w-4 h-4" />
          </button>
          {state.isProcessing && (
            <button
              onClick={handleInterrupt}
              className="p-1 hover:bg-gray-800 rounded"
              title="Stop response"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleReset}
            className="p-1 hover:bg-gray-800 rounded"
            title="Reset everything"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tool Tester */}
      <CollapsibleSection title="MANUAL_TOOL_TEST">
        <ToolTester />
      </CollapsibleSection>

      {/* Transformers.js Test */}
      <CollapsibleSection title="TRANSFORMERS.JS TEST">
        <TransformersTest />
      </CollapsibleSection>

      {/* Vault Debugger */}
      <CollapsibleSection title="VAULT DEBUGGER">
        <VaultDebugger />
      </CollapsibleSection>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {state.messages.map(renderMessage)}
        
        {/* ALWAYS show status when processing - event-driven, no complex conditions */}
        {state.isProcessing && (
          <div className="mb-4 font-mono text-xs">
            {state.isSummarizing ? (
              <>
                <div className="text-yellow-400 mb-1">SUMMARIZING</div>
                <div className="text-gray-400">Condensing conversation to save context...</div>
              </>
            ) : state.executingTool ? (
              <>
                <div className="text-cyan-400 mb-1 flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  EXECUTING: {state.executingTool}
                </div>
              </>
            ) : (
              <>
                <div className="text-gray-500 mb-1">ASSISTANT</div>
                <div className="text-gray-400 flex items-center gap-1">
                  <span className="animate-pulse">thinking...</span>
                </div>
              </>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Feedback */}
      {copyFeedback && (
        <div className="px-3 py-1 text-xs text-green-400">
          {copyFeedback}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={state.isProcessing}
          placeholder="Type message..."
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-500 disabled:opacity-50"
        />
      </form>
    </div>
  )
}

