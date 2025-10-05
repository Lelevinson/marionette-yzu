// Vault system - IndexedDB storage for captured web pages
import { generateEmbedding, cosineSimilarity } from './embeddings'

const DB_NAME = 'marionette_vault'
const DB_VERSION = 1
const STORE_NAME = 'pages'

export interface VaultEntry {
  id: string // timestamp-based ID
  url: string
  title: string
  content: string // cleaned text content
  excerpt: string // first 200 chars
  embedding: number[] // 384D vector
  timestamp: number
  domain: string
  wordCount: number
}

// Initialize IndexedDB
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('domain', 'domain', { unique: false })
        store.createIndex('url', 'url', { unique: false })
      }
    }
  })
}

// Store a page in the vault
export async function storePageInVault(entry: Omit<VaultEntry, 'id' | 'timestamp' | 'embedding'>): Promise<string> {
  try {
    console.log('[Vault] Storing page:', entry.url)
    console.log('[Vault] Content length:', entry.content.length)
    console.log('[Vault] Content preview:', entry.content.slice(0, 100))
    
    // Generate embedding
    const embedding = await generateEmbedding(entry.content)
    console.log('[Vault] Embedding generated:', embedding.length, 'dimensions')
    console.log('[Vault] Embedding sample:', embedding.slice(0, 5))
    console.log('[Vault] Embedding is Array?', Array.isArray(embedding))
    
    // Create full entry - ensure embedding is stored as plain array
    const fullEntry: VaultEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
      embedding: Array.from(embedding) // Convert to plain array
    }
    
    // Store in IndexedDB
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(fullEntry)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    console.log('[Vault] Page stored:', fullEntry.id)
    return fullEntry.id
  } catch (error) {
    console.error('[Vault] Error storing page:', error)
    throw error
  }
}

// Search vault using semantic search
export async function searchVault(
  query: string, 
  limit: number = 10, 
  threshold: number = 0.3
): Promise<Array<VaultEntry & { similarity: number }>> {
  try {
    console.log('[Vault] Searching for:', query)
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query)
    
    // Get all entries from vault
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const entries = await new Promise<VaultEntry[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    if (entries.length === 0) {
      console.log('[Vault] No entries found')
      return []
    }
    
    console.log('[Vault] Comparing with', entries.length, 'entries')
    console.log('[Vault] Query embedding length:', queryEmbedding.length)
    console.log('[Vault] Query embedding sample:', queryEmbedding.slice(0, 5))
    
    // Calculate similarity for each entry
    const results = entries.map(entry => {
      console.log('[Vault] Entry embedding type:', typeof entry.embedding, Array.isArray(entry.embedding))
      console.log('[Vault] Entry embedding length:', entry.embedding?.length)
      console.log('[Vault] Entry embedding sample:', entry.embedding?.slice(0, 5))
      
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding)
      console.log(`[Vault] "${entry.title.slice(0, 50)}" - Similarity: ${(similarity * 100).toFixed(1)}%`)
      return {
        ...entry,
        similarity
      }
    })
    
    // Sort by similarity and filter by threshold
    const filtered = results
      .filter(r => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
    
    console.log('[Vault] Found', filtered.length, 'matches above', (threshold * 100).toFixed(0) + '%')
    console.log('[Vault] Top scores:', results.slice(0, 3).map(r => (r.similarity * 100).toFixed(1) + '%').join(', '))
    return filtered
  } catch (error) {
    console.error('[Vault] Error searching vault:', error)
    throw error
  }
}

// Get vault statistics
export async function getVaultStats(): Promise<{
  count: number
  oldestEntry?: number
  newestEntry?: number
  domains: Record<string, number>
}> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    const entries = await new Promise<VaultEntry[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    if (entries.length === 0) {
      return { count: 0, domains: {} }
    }
    
    // Calculate stats
    const timestamps = entries.map(e => e.timestamp)
    const domains: Record<string, number> = {}
    
    entries.forEach(e => {
      domains[e.domain] = (domains[e.domain] || 0) + 1
    })
    
    return {
      count: entries.length,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
      domains
    }
  } catch (error) {
    console.error('[Vault] Error getting stats:', error)
    throw error
  }
}

// Clear entire vault
export async function clearVault(): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    console.log('[Vault] Cleared all entries')
  } catch (error) {
    console.error('[Vault] Error clearing vault:', error)
    throw error
  }
}

// Delete old entries (cleanup)
export async function cleanupVault(maxEntries: number = 100): Promise<number> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    
    // Get all entries sorted by timestamp
    const entries = await new Promise<VaultEntry[]>((resolve, reject) => {
      const request = index.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    if (entries.length <= maxEntries) {
      return 0
    }
    
    // Sort by timestamp and get entries to delete
    entries.sort((a, b) => a.timestamp - b.timestamp)
    const toDelete = entries.slice(0, entries.length - maxEntries)
    
    // Delete entries
    await Promise.all(
      toDelete.map(entry => 
        new Promise<void>((resolve, reject) => {
          const request = store.delete(entry.id)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      )
    )
    
    console.log('[Vault] Cleaned up', toDelete.length, 'entries')
    return toDelete.length
  } catch (error) {
    console.error('[Vault] Error cleaning up:', error)
    throw error
  }
}
