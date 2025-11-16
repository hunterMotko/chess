# ChessGame Component: State & Lifecycle Flow Diagram

## State Variables & References

### Setup & Configuration State
```
gameStarted (boolean)
    └─ Initialized: learningMode (true in learning mode)
    └─ Controls: GameSetup UI visibility

gameType ('human' | 'ai' | null)
    └─ Set by: handleGameSetup, handleNewGame, AI initialization
    └─ Used by: Move validation, AI initialization

aiDifficulty (number | null)
    └─ Set by: handleGameSetup, AI initialization
    └─ Values: 1-10 (from backend Stockfish levels)

playerColor ('white' | 'black' | null)
    └─ Set by: handleGameSetup, determinePlayerColorFromPGNAndECO()
    └─ Effect: Board flip, move restrictions, AI trigger

aiGameInitialized (boolean)
    └─ Guard: Prevents duplicate AI game creation
```

### Chess Instances (Refs - Not causing re-renders)
```
chess (useRef<Chess>)
    └─ Main game instance
    └─ Initialized once, persists across renders
    └─ Updated by: Move execution, game reset

openingChess (useRef<Chess>)
    └─ For extracting opening moves from PGN
    └─ Read-only during component lifecycle

navigationChess (useRef<Chess>)
    └─ For playback/history navigation
    └─ Reset & replayed when navigating to specific moves
```

### Socket Connection State
```
useSocket({ gameId }) hook
    ├─ data: WebSocket message payload
    ├─ isConnected: boolean
    ├─ isReconnecting: boolean
    ├─ reconnectAttempts: number
    ├─ maxReconnectAttempts: number
    ├─ sendMsg(): Send message to backend
    └─ reconnect(): Manual reconnection attempt
```

### Core Game State (Consolidated)
```
gameState (GameState object)
├─ fen: string (current position)
├─ turn: 'w' | 'b' (whose turn)
├─ history: string[] (all moves in UCI)
├─ isGameOver: boolean
└─ gameOutcome: string | null (checkmate, draw, stalemate, resignation)

Initialization:
    Start with chess.current.fen() and empty history

Update triggers:
    ├─ updateGameStateFromChess() - Manual sync
    ├─ Socket 'game_state' message
    ├─ Socket 'ai_move' message
    └─ executeMove() - After player move
```

### Board & Move Interaction State
```
isFlipped (boolean)
    └─ Set by: handleFlipBoard, playerColor effect
    └─ Default: false (white on bottom)
    └─ Effect on: Board display orientation, piece selection

sourceSquare (string | null)
    └─ Selected piece square (a1-h8)
    └─ Cleared after: Move execution, game over
    └─ Used by: Move validation, highlighting

availableMoves (string[])
    └─ Legal moves from sourceSquare
    └─ Updated by: onDragStart, onClick
    └─ Cleared by: onPieceDrop, game over

lastMove ({ from: string; to: string } | null)
    └─ Track last completed move
    └─ Cleared by: Game reset, new game
    └─ Display: Highlight move on board

lastMoveAttempt (object | null)
    ├─ from: string
    ├─ to: string
    ├─ isIllegal: boolean
    ├─ errorMessage?: string
    └─ Display: Error feedback for invalid moves
```

### Piece Capture Tracking
```
capturedByWhite (string[])
    └─ Black pieces captured by white
    └─ Updated by: trackCapture() in executeMove & socket ai_move

capturedByBlack (string[])
    └─ White pieces captured by black
    └─ Updated by: trackCapture() in executeMove & socket ai_move

Display: CapturedPieces component
```

### Promotion State
```
pendingPromotion (PendingPromotion | null)
    ├─ from: string
    ├─ to: string
    └─ color: 'white' | 'black'

Triggered by: isPromotionMove() check in onPieceDrop
Resolved by: handlePromotionSelect or handlePromotionCancel
Display: PromotionModal component
```

### Playback/History Navigation State
```
playbackState (PlaybackState)
├─ isActive: boolean (viewing history vs live game)
├─ currentMoveIndex: number (-1 = initial, 0+ = move index)
└─ maxMoveIndex: number

Triggered by: handleFirstMove, handlePreviousMove, handleNextMove, handleLastMove
Updates: navigationChess to replay moves up to target index
```

### Opening Demo State (Learning Mode)
```
openingDemo (OpeningDemoState)
├─ isPlaying: boolean
├─ moves: string[] (opening moves)
├─ currentMoveIndex: number
└─ isComplete: boolean

Initialized by: useMemo(openingMoves)
Auto-played: Moves sent with 1.5s interval delays
Blocks user interaction: Until isComplete or no moves
```

### User Interaction Tracking
```
userMoveCounter (number)
    └─ Incremented on each player move
    └─ Used by: GameStatusModal for dismissal timing
```

### Move History Reference
```
moveHistoryRef (useRef<string[]>)
    └─ Synced with gameState.history
    └─ Prevents array recreation from causing re-renders
```

---

## Lifecycle Hooks Flow

```
┌─────────────────────────────────────────────────────────────┐
│         COMPONENT INITIALIZATION                             │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─ Effect 1: Move History Sync (lines 242-255) ────────────┐
│ Dependencies: [gameState.history, playbackState.isActive] │
│ Action: Sync moveHistoryRef with gameState.history        │
│         Reset playback if viewing history & new moves     │
└────────────────────────────────────────────────────────────┘
         ↓
┌─ Effect 2: Player Color → Board Flip (lines 443-450) ────┐
│ Dependencies: [playerColor]                                │
│ When playerColor changes:                                  │
│   ├─ 'black' → setIsFlipped(true)                         │
│   ├─ 'white' → setIsFlipped(false)                        │
│   └─ null → no flip                                        │
└────────────────────────────────────────────────────────────┘
         ↓
┌─ Effect 3: Opening Demo Load (lines 454-463) ────────────┐
│ Dependencies: [openingMoves, openingDemo.moves.length]    │
│ When: Opening moves parsed from PGN                        │
│ Action: Initialize openingDemo state with moves           │
└────────────────────────────────────────────────────────────┘
         ↓
┌─ Effect 4: Socket Data Handler (lines 467-559) ──────────┐
│ Dependencies: [data]                                        │
│ Handles incoming WebSocket messages:                       │
│                                                             │
│ Message Type: 'game_state'                                │
│   ├─ Load FEN into chess.current                          │
│   ├─ Update gameState (history, turn, outcome)            │
│   └─ Trigger AI move if: player=black, no history yet     │
│                                                             │
│ Message Type: 'ai_move'                                    │
│   ├─ Apply move to chess.current                          │
│   ├─ Track captures                                        │
│   ├─ Update gameState & lastMove highlight                │
│   └─ Display AI's move                                     │
│                                                             │
│ Message Type: 'game_over'                                  │
│   ├─ Set gameState.isGameOver = true                      │
│   └─ Set gameState.gameOutcome (result string)            │
└────────────────────────────────────────────────────────────┘
         ↓
┌─ Effect 5: Game Over Handler (lines 562-568) ────────────┐
│ Dependencies: [gameState.isGameOver]                       │
│ When game ends:                                            │
│   ├─ Clear availableMoves                                 │
│   └─ Clear sourceSquare                                   │
│   (Prevents further moves)                                │
└────────────────────────────────────────────────────────────┘
         ↓
┌─ Effect 6: AI Initialization (lines 915-981) ─────────────┐
│ Dependencies: [isConnected, learningMode, eco, pgn,        │
│               aiGameInitialized, sendMsg, openingMoves]   │
│                                                             │
│ Trigger: When connected + learningMode + has content      │
│          + not yet initialized                             │
│                                                             │
│ Actions:                                                   │
│   ├─ Determine playerColor from PGN + ECO                 │
│   ├─ Send 'new_ai_game' message to backend                │
│   ├─ Auto-replay opening moves with 1.5s delays           │
│   │   └─ Update openingDemo.currentMoveIndex on each      │
│   ├─ Set openingDemo.isComplete when done                 │
│   └─ Trigger AI move if player is black                   │
│                                                             │
│ Guard: aiGameInitialized prevents duplicate execution     │
└────────────────────────────────────────────────────────────┘
```

---

## Key Event Handlers & Data Flow

### Board Interaction Flow
```
┌─ Click/Drag on Square ──────────────────────────────────┐
│                                                          │
├─ If no source selected: onDragStart or onClick         │
│   ├─ Check: canPlayerMove(square)? (AI color check)    │
│   ├─ Get legal moves from chess.current                │
│   ├─ Set sourceSquare                                  │
│   └─ Set availableMoves (highlight)                    │
│                                                          │
├─ If source selected: onDrop or onClick                 │
│   ├─ Check: sourceSquare === targetSquare?             │
│   │   └─ Yes → Deselect (clear sourceSquare)           │
│   └─ No → onPieceDrop(targetSquare)                    │
│       ├─ Check: isPromotionMove?                       │
│       │   └─ Yes → Set pendingPromotion modal          │
│       └─ No → executeMove(from, to)                    │
│           ├─ Update chess.current                      │
│           ├─ trackCapture()                            │
│           ├─ updateGameStateFromChess()                │
│           ├─ Send 'move' message via socket            │
│           └─ Clear sourceSquare & availableMoves       │
└──────────────────────────────────────────────────────────┘
```

### Move Execution Flow
```
executeMove(from, to, promotionPiece?)
    ├─ Try: chess.current.move({from, to, promotion})
    ├─ Success:
    │   ├─ trackCapture() → Update capturedByWhite/Black
    │   ├─ updateGameStateFromChess() → Sync gameState
    │   ├─ setLastMove({from, to}) → Highlight
    │   ├─ setUserMoveCounter++ → Modal tracking
    │   └─ sendMsg('move', payload) → Backend
    └─ Failure:
        ├─ getIllegalMoveMessage() → Error message
        └─ setLastMoveAttempt() → Display error (1.2s)
```

### Game Setup Flow
```
Initial State: gameStarted = false (unless learningMode)
    ↓
User selects difficulty & color via GameSetup component
    ↓
handleGameSetup(difficulty, playerColor)
    ├─ setGameType('ai')
    ├─ setAiDifficulty(difficulty)
    ├─ setPlayerColor(playerColor)
    ├─ setGameStarted(true)
    └─ handleNewAIGame(difficulty, playerColor)
        ├─ Reset chess.current
        ├─ Reset all UI state
        ├─ sendMsg('new_ai_game', {difficulty, playerColor})
        └─ If playerColor='black' → Auto-trigger AI move
```

### Learning Mode Flow
```
Component Props: learningMode=true, pgn, eco
    ↓
gameStarted initialized to true (skip GameSetup)
    ↓
useMemo extracts openingMoves from pgn
    ↓
Effect 3: Update openingDemo state with moves
    ↓
Effect 6: AI Initialization
    ├─ Wait for socket connection
    ├─ Determine playerColor from PGN + ECO analysis
    ├─ Send 'new_ai_game' message
    ├─ Auto-play opening moves (1.5s intervals)
    └─ Set openingDemo.isComplete when done
    ↓
User interaction blocks until openingDemo.isComplete
    ├─ Checked in: onDragStart, onClick, onPieceDrop
    └─ allowInteraction = openingDemo.isComplete || openingMoves.length === 0
```

### Playback/History Navigation Flow
```
handleFirstMove() → Move to initial position
    ├─ playbackState.currentMoveIndex = -1
    ├─ navigationChess.reset()
    └─ displayFen uses navigationChess.fen()

handlePreviousMove() → Go back one move
    ├─ If not in playback: Start at last move
    └─ Decrement currentMoveIndex
        └─ reconstructPositionAtMove() & update displayFen

handleNextMove() → Go forward one move
    ├─ If not in playback: Start at first move
    └─ Increment currentMoveIndex (capped at max)
        └─ reconstructPositionAtMove() & update displayFen

handleLastMove() → Return to live game
    ├─ playbackState.isActive = false
    └─ displayFen reverts to gameState.fen

Navigation guards in event handlers:
    └─ if (playbackState.isActive) return
       (Prevents moves while viewing history)
```

---

## State Dependency Graph

```
┌─ Socket Connection
│  └─ isConnected → triggers AI initialization
│
├─ Game Setup
│  ├─ gameStarted
│  ├─ gameType
│  ├─ playerColor → isFlipped effect
│  └─ aiDifficulty
│
├─ Core Game State
│  ├─ gameState.fen
│  ├─ gameState.history → moveHistoryRef sync
│  ├─ gameState.turn
│  ├─ gameState.isGameOver → game over effect
│  └─ gameState.gameOutcome
│
├─ Board Display
│  ├─ isFlipped → boardArray memoization
│  ├─ sourceSquare → user move flow
│  ├─ availableMoves → highlight squares
│  └─ boardArray (memoized from: displayFen + isFlipped)
│       └─ displayFen = playbackState.isActive ? navigationChess.fen() : gameState.fen
│
├─ Move Tracking
│  ├─ lastMove → highlight last move
│  ├─ lastMoveAttempt → error feedback
│  └─ capturedByWhite/Black → piece tracking
│
├─ Special Modes
│  ├─ openingDemo → learning mode auto-play
│  └─ playbackState → history playback
│
└─ User Interaction
   └─ userMoveCounter → modal dismissal
```

---

## Critical State Update Patterns

### Pattern 1: Preventing Unnecessary Re-renders
```javascript
// gameState updates check for actual changes
setGameState(prev => {
    const hasChanges = prev.fen !== newFen || /* ... */
    return hasChanges ? { ...prev, newData } : prev
})

// moveHistoryRef is separate from render state
useEffect(() => {
    if (gameState.history !== moveHistoryRef.current) {
        moveHistoryRef.current = gameState.history
    }
})
```

### Pattern 2: Guarding Against Multiple Initializations
```javascript
// aiGameInitialized flag prevents duplicate AI setup
useEffect(() => {
    if (/* ... */ && !aiGameInitialized && sendMsg) {
        setAiGameInitialized(true)
        sendMsg('new_ai_game', payload)
    }
}, [/* depends on aiGameInitialized */])
```

### Pattern 3: Chess Instance Persistence
```javascript
// Chess instances created once with useRef
if (!chess.current) {
    chess.current = new Chess()
}
// Later updates don't recreate, just call methods
chess.current.move(...)
chess.current.load(fen)
```

---

## Render Output Conditions

```
if (!gameStarted && !learningMode)
    └─ Show: GameSetup component

else
    └─ Show: Full game interface
        ├─ ChessBoard (with boardArray display)
        ├─ If (learningMode && !openingDemo.isComplete)
        │   └─ GameStatsLearning (showing demo progress)
        └─ Else
            └─ GameStats (with playback controls)

        ├─ PromotionModal (if pendingPromotion)
        ├─ GameStatusModal (error/status messages)
        ├─ CapturedPieces (above/below board)
        ├─ MobileGameMenu (mobile only)
        └─ Connection status banner (if !isConnected)
```

---

## Performance Optimizations

1. **useMemo for boardArray**: Prevents re-calculation when display doesn't change
2. **useCallback for all handlers**: Prevents unnecessary re-renders of child components
3. **Consolidated gameState**: Reduces number of state updates
4. **moveHistoryRef**: Array changes don't trigger re-renders
5. **Chess instance refs**: Game logic separate from React rendering

---

## Summary: Complete State Lifecycle

```
Component Mount
    ↓
Initialize chess refs (once)
    ↓
Set initial gameState from chess.current
    ↓
Set initial playbackState (live game mode)
    ↓
Socket connects (useSocket hook)
    ↓
If learningMode: Effect 6 triggers → AI initialization
    ↓
Listen for socket messages (Effect 4)
    ├─ Update gameState on 'game_state'/'ai_move'
    └─ Update gameOutcome on 'game_over'
    ↓
User interacts with board
    ├─ onDragStart/onClick → Set sourceSquare + availableMoves
    ├─ onDrop → Trigger executeMove or promotion modal
    └─ executeMove → Update chess instance, gameState, send via socket
    ↓
Effects respond to state changes
    ├─ Effect 2: playerColor → Board flip
    ├─ Effect 1: history → Playback state reset
    └─ Effect 5: isGameOver → Clear interaction state
    ↓
User clicks "New Game"
    ├─ handleNewGame → Reset all state
    └─ setGameStarted(false) → Return to GameSetup
    ↓
Component Unmount
    └─ WebSocket closes (useSocket cleanup)
```
