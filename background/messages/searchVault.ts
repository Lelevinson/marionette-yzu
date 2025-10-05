// searchVault tool - Semantic search through captured pages
import type { ToolSpec } from '../../lib/tool-registry'
import { searchVault as vaultSearch } from '../../lib/vault'

async function searchVault(params: any) {
  try {
    const { query, limit = 5 } = params
    
    if (!query || typeof query !== 'string') {
      return { success: false, error: 'Query is required and must be a string' }
    }

    console.log('[searchVault] Searching for:', query)

    const results = await vaultSearch(query, limit, 0.2) // 20% threshold - more lenient

    if (results.length === 0) {
      return {
        success: true,
        result: `No pages found matching "${query}".\n\nTip: Try capturing more pages with captureCurrentPage.`,
        pages: []
      }
    }

    // Format results for display
    const formattedResults = results.map((page, index) => {
      const similarityPercent = (page.similarity * 100).toFixed(0)
      return `[${index + 1}] ${page.title} [${similarityPercent}% match]\n   ${page.domain} • ${page.wordCount} words\n   ${page.excerpt}\n   ${page.url}`
    }).join('\n\n')

    return {
      success: true,
      result: `Found ${results.length} pages matching "${query}":\n\n${formattedResults}`,
      pages: results.map(p => ({
        id: p.id,
        title: p.title,
        url: p.url,
        domain: p.domain,
        excerpt: p.excerpt,
        similarity: p.similarity,
        timestamp: p.timestamp
      })),
      count: results.length
    }
  } catch (error: any) {
    console.error('[searchVault] Error:', error)
    return { success: false, error: error.message }
  }
}

export const spec: ToolSpec = {
  name: 'searchVault',
  description: 'Search through captured pages using AI-powered semantic search. Finds pages by meaning, not just keywords.',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Search query describing what you\'re looking for (e.g., "articles about AI agents", "pricing information")',
      required: true
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Maximum number of results to return (default: 5)',
      required: false
    }
  ],
  examples: [
    'User: "find that article about AI I read" → searchVault with query: "AI article"',
    'User: "show me pages about pricing" → searchVault with query: "pricing"',
    'User: "where did I see that tutorial?" → searchVault with query: "tutorial"'
  ],
  spokenLine: 'Searching vault'
}

export default searchVault
