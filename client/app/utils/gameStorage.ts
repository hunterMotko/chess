// Game storage system using IndexedDB for chess game persistence
// Provides save/load games, session recovery, and game history

import { Chess } from 'chess.js'

export interface SavedGame {
  id: string
  name: string
  pgn: string
  fen: string
  gameType: 'human_vs_ai' | 'human_vs_human' | 'learning'
  difficulty?: number
  playerColor?: 'white' | 'black'
  createdAt: Date
  updatedAt: Date
  isCompleted: boolean
  result?: string
  moveCount: number
  timeSpent: number // in seconds
  eco?: string // ECO code for openings
  tags: string[] // Custom tags for organization
}

export interface GameSession {
  gameId: string
  lastSaved: Date
  autoSave: boolean
}

class GameStorageService {
  private dbName = 'ChessGameDB'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  constructor() {
    this.initializeDB()
  }

  private async initializeDB(): Promise<void> {
    // Check if running in browser
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available')
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create games store
        if (!db.objectStoreNames.contains('games')) {
          const gamesStore = db.createObjectStore('games', { keyPath: 'id' })
          gamesStore.createIndex('gameType', 'gameType', { unique: false })
          gamesStore.createIndex('createdAt', 'createdAt', { unique: false })
          gamesStore.createIndex('isCompleted', 'isCompleted', { unique: false })
          gamesStore.createIndex('eco', 'eco', { unique: false })
        }

        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'gameId' })
          sessionsStore.createIndex('lastSaved', 'lastSaved', { unique: false })
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  // Game CRUD operations
  async saveGame(game: Omit<SavedGame, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const id = crypto.randomUUID()
    const now = new Date()
    const savedGame: SavedGame = {
      ...game,
      id,
      createdAt: now,
      updatedAt: now
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readwrite')
      const store = transaction.objectStore('games')
      const request = store.add(savedGame)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async updateGame(id: string, updates: Partial<SavedGame>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readwrite')
      const store = transaction.objectStore('games')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const game = getRequest.result
        if (!game) {
          reject(new Error('Game not found'))
          return
        }

        const updatedGame = {
          ...game,
          ...updates,
          updatedAt: new Date()
        }

        const putRequest = store.put(updatedGame)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async loadGame(id: string): Promise<SavedGame | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readonly')
      const store = transaction.objectStore('games')
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteGame(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readwrite')
      const store = transaction.objectStore('games')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Game history and search
  async getGameHistory(limit = 50, offset = 0): Promise<SavedGame[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readonly')
      const store = transaction.objectStore('games')
      const index = store.index('createdAt')
      const request = index.openCursor(null, 'prev') // Most recent first

      const games: SavedGame[] = []
      let count = 0

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && count < offset + limit) {
          if (count >= offset) {
            games.push(cursor.value)
          }
          count++
          cursor.continue()
        } else {
          resolve(games)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async searchGames(filters: {
    gameType?: string
    isCompleted?: boolean
    eco?: string
    tags?: string[]
    fromDate?: Date
    toDate?: Date
  }): Promise<SavedGame[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['games'], 'readonly')
      const store = transaction.objectStore('games')
      const request = store.getAll()

      request.onsuccess = () => {
        let games = request.result as SavedGame[]

        // Apply filters
        if (filters.gameType) {
          games = games.filter(game => game.gameType === filters.gameType)
        }

        if (filters.isCompleted !== undefined) {
          games = games.filter(game => game.isCompleted === filters.isCompleted)
        }

        if (filters.eco) {
          games = games.filter(game => game.eco === filters.eco)
        }

        if (filters.tags && filters.tags.length > 0) {
          games = games.filter(game =>
            filters.tags!.some(tag => game.tags.includes(tag))
          )
        }

        if (filters.fromDate) {
          games = games.filter(game => game.createdAt >= filters.fromDate!)
        }

        if (filters.toDate) {
          games = games.filter(game => game.createdAt <= filters.toDate!)
        }

        // Sort by creation date (most recent first)
        games.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        resolve(games)
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Session management
  async saveSession(session: GameSession): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')
      const request = store.put(session)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async loadSession(gameId: string): Promise<GameSession | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readonly')
      const store = transaction.objectStore('sessions')
      const request = store.get(gameId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async clearOldSessions(olderThanDays = 7): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite')
      const store = transaction.objectStore('sessions')
      const index = store.index('lastSaved')
      const range = IDBKeyRange.upperBound(cutoffDate)
      const request = index.openCursor(range)

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  // PGN export/import
  async exportGameToPGN(gameId: string): Promise<string> {
    const game = await this.loadGame(gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    return game.pgn
  }

  async exportAllGamesToPGN(): Promise<string> {
    const games = await this.getGameHistory(1000) // Export up to 1000 games
    return games.map(game => game.pgn).join('\n\n')
  }

  async importGameFromPGN(pgn: string, metadata?: Partial<SavedGame>): Promise<string> {
    // Validate PGN
    const chess = new Chess()
    try {
      chess.loadPgn(pgn)
    } catch (error) {
      throw new Error('Invalid PGN format')
    }

    const game: Omit<SavedGame, 'id' | 'createdAt' | 'updatedAt'> = {
      name: metadata?.name || `Imported Game ${new Date().toLocaleDateString()}`,
      pgn,
      fen: chess.fen(),
      gameType: metadata?.gameType || 'human_vs_human',
      difficulty: metadata?.difficulty,
      playerColor: metadata?.playerColor,
      isCompleted: chess.isGameOver(),
      result: chess.isGameOver() ? this.getGameResult(chess) : undefined,
      moveCount: chess.history().length,
      timeSpent: metadata?.timeSpent || 0,
      eco: metadata?.eco,
      tags: metadata?.tags || []
    }

    return this.saveGame(game)
  }

  private getGameResult(chess: Chess): string {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? '0-1' : '1-0'
    } else if (chess.isDraw() || chess.isStalemate()) {
      return '1/2-1/2'
    }
    return '*'
  }

  // Statistics
  async getGameStats(): Promise<{
    totalGames: number
    completedGames: number
    wins: number
    losses: number
    draws: number
    averageGameLength: number
    favoriteOpenings: { eco: string; count: number }[]
  }> {
    const games = await this.getGameHistory(1000)

    const stats = {
      totalGames: games.length,
      completedGames: games.filter(g => g.isCompleted).length,
      wins: games.filter(g => g.result === '1-0').length,
      losses: games.filter(g => g.result === '0-1').length,
      draws: games.filter(g => g.result === '1/2-1/2').length,
      averageGameLength: games.reduce((sum, g) => sum + g.moveCount, 0) / games.length || 0,
      favoriteOpenings: this.getFavoriteOpenings(games)
    }

    return stats
  }

  private getFavoriteOpenings(games: SavedGame[]): { eco: string; count: number }[] {
    const ecoCount = new Map<string, number>()

    games.forEach(game => {
      if (game.eco) {
        ecoCount.set(game.eco, (ecoCount.get(game.eco) || 0) + 1)
      }
    })

    return Array.from(ecoCount.entries())
      .map(([eco, count]) => ({ eco, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 openings
  }
}

// Global instance
export const gameStorage = new GameStorageService()

// React hooks for easy usage
export function useGameStorage() {
  return {
    saveGame: gameStorage.saveGame.bind(gameStorage),
    loadGame: gameStorage.loadGame.bind(gameStorage),
    updateGame: gameStorage.updateGame.bind(gameStorage),
    deleteGame: gameStorage.deleteGame.bind(gameStorage),
    getGameHistory: gameStorage.getGameHistory.bind(gameStorage),
    searchGames: gameStorage.searchGames.bind(gameStorage),
    exportGameToPGN: gameStorage.exportGameToPGN.bind(gameStorage),
    exportAllGamesToPGN: gameStorage.exportAllGamesToPGN.bind(gameStorage),
    importGameFromPGN: gameStorage.importGameFromPGN.bind(gameStorage),
    getGameStats: gameStorage.getGameStats.bind(gameStorage),
    saveSession: gameStorage.saveSession.bind(gameStorage),
    loadSession: gameStorage.loadSession.bind(gameStorage)
  }
}