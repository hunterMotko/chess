-- Create games table for storing chess game data
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id VARCHAR(255) UNIQUE NOT NULL, -- External game identifier used in WebSocket
    game_type VARCHAR(50) NOT NULL, -- 'human_vs_human', 'human_vs_ai', 'ai_vs_ai'
    status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'abandoned'
    fen TEXT NOT NULL, -- Current board position in FEN notation
    pgn TEXT, -- Full game in PGN format
    white_player_id VARCHAR(255),
    white_player_name VARCHAR(255),
    black_player_id VARCHAR(255), 
    black_player_name VARCHAR(255),
    current_turn VARCHAR(5) NOT NULL DEFAULT 'white', -- 'white' or 'black'
    ai_difficulty INTEGER DEFAULT 0, -- 0-20, only relevant for AI games
    winner VARCHAR(5), -- 'white', 'black', 'draw', null for ongoing games
    outcome VARCHAR(50), -- 'checkmate', 'stalemate', 'resignation', 'timeout', 'draw'
    move_count INTEGER DEFAULT 0,
    time_control JSONB, -- Store time control settings if needed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX idx_games_game_id ON games(game_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_game_type ON games(game_type);
CREATE INDEX idx_games_white_player ON games(white_player_id);
CREATE INDEX idx_games_black_player ON games(black_player_id);
CREATE INDEX idx_games_created_at ON games(created_at);

-- Create game_moves table for storing individual moves
CREATE TABLE IF NOT EXISTS game_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL, -- 1, 2, 3... (full moves, not half-moves)
    white_move VARCHAR(10), -- Move in algebraic notation (e.g., 'e4', 'Nf3')
    black_move VARCHAR(10), -- Move in algebraic notation  
    white_move_san VARCHAR(20), -- Standard algebraic notation with checks, etc.
    black_move_san VARCHAR(20),
    position_after_white TEXT, -- FEN after white's move
    position_after_black TEXT, -- FEN after black's move
    time_taken_white INTEGER, -- Time taken in milliseconds
    time_taken_black INTEGER,
    evaluation_white INTEGER, -- Engine evaluation in centipawns after white's move
    evaluation_black INTEGER, -- Engine evaluation in centipawns after black's move
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for game_moves
CREATE INDEX idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX idx_game_moves_move_number ON game_moves(game_id, move_number);

-- Create game_analysis table for storing position analysis
CREATE TABLE IF NOT EXISTS game_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    position_fen TEXT NOT NULL,
    depth INTEGER NOT NULL,
    evaluation INTEGER, -- Evaluation in centipawns
    best_move VARCHAR(10),
    principal_variation TEXT, -- Best line of play
    analysis_time INTEGER, -- Time taken for analysis in milliseconds
    engine_name VARCHAR(100) DEFAULT 'Stockfish',
    engine_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for game_analysis
CREATE INDEX idx_game_analysis_game_id ON game_analysis(game_id);
CREATE INDEX idx_game_analysis_position ON game_analysis(position_fen);

-- Add updated_at trigger for games table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();