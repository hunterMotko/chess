# Chess Game

A full-stack chess application featuring real-time gameplay, chess openings reference, and game analysis. Built with React Router v7 frontend and Go backend with WebSocket communication.

## Features

- **Real-time Chess Gameplay** - Play against Stockfish engine with live move synchronization
- **Chess Openings Reference** - Browse ECO-classified openings (A00-E99) with pagination
- **Game State Persistence** - Save and load games with PGN support
- **Live Game Analysis** - Real-time board updates via WebSocket connection

## Tech Stack

### Frontend
- **React Router v7** - Full-stack React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Modern styling
- **chess.js** - Chess game logic and validation
- **Vite** - Fast development and build tool

### Backend
- **Go** - High-performance backend
- **Echo** - Web framework for HTTP and WebSocket handling
- **PostgreSQL** - Database with lib/pq driver
- **corentings/chess/v2** - Chess engine integration
- **gorilla/websocket** - Real-time communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Go 1.21+
- PostgreSQL
- Air (for Go hot reloading): `go install github.com/air-verse/air@latest`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chess-game
   ```

2. **Set up the backend**
   ```bash
   # Install Go dependencies
   go mod tidy
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the frontend**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Database setup**
   ```bash
   # Create PostgreSQL database and run migrations
   # (Add your specific migration commands here)
   ```

### Development

**Start the backend** (from root directory):
```bash
air  # Hot reloading development server
```

**Start the frontend** (from `client/` directory):
```bash
npm run dev  # Development server on http://localhost:5173
```

### Building for Production

**Backend**:
```bash
go build -o ./tmp/main .
```

**Frontend**:
```bash
cd client
npm run build
npm run start  # Serve production build
```

### Testing

**Backend tests**:
```bash
go test ./... -v
```

**Frontend tests**:
```bash
cd client
npm test
```

**Type checking**:
```bash
cd client
npm run typecheck
```

## API Endpoints

- `GET /check-h` - Health check
- `GET /api/openings/:volume` - Get chess openings by ECO volume (A-E)
- `WS /ws/:gameId` - WebSocket connection for real-time gameplay

## WebSocket Events

The application uses WebSocket communication for real-time game updates:

- `new_game` - Initialize a new chess game
- `move` - Send/receive chess moves
- `load_pgn` - Load game from PGN notation
- `game_over` - Handle game completion

## Chess Openings Reference

The application includes a comprehensive chess openings database organized by ECO (Encyclopaedia of Chess Openings) classification:

- **Volume A**: Flank openings and atypical systems
- **Volume B**: Semi-open games (Sicilian, Caro-Kann, etc.)
- **Volume C**: Open games and French Defense
- **Volume D**: Closed games and Queen's Gambit systems
- **Volume E**: Indian Defense systems

## Project Structure

```
chess-game/
├── client/                 # React frontend
│   ├── app/               # Application code
│   ├── public/            # Static assets
│   └── package.json
├── internal/              # Go backend modules
│   ├── database/          # Database operations
│   ├── server/            # HTTP routes and handlers
│   └── websockets/        # WebSocket game logic
├── tests/                 # Integration tests
├── main.go               # Application entry point
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.