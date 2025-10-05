package database

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type GameRow struct {
	ID              uuid.UUID  `db:"id"`
	GameID          string     `db:"game_id"`
	GameType        string     `db:"game_type"`
	Status          string     `db:"status"`
	FEN             string     `db:"fen"`
	PGN             *string    `db:"pgn"`
	WhitePlayerID   *string    `db:"white_player_id"`
	WhitePlayerName *string    `db:"white_player_name"`
	BlackPlayerID   *string    `db:"black_player_id"`
	BlackPlayerName *string    `db:"black_player_name"`
	CurrentTurn     string     `db:"current_turn"`
	AIDifficulty    int        `db:"ai_difficulty"`
	Winner          *string    `db:"winner"`
	Outcome         *string    `db:"outcome"`
	MoveCount       int        `db:"move_count"`
	TimeControl     *string    `db:"time_control"` // JSON string
	CreatedAt       time.Time  `db:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at"`
	CompletedAt     *time.Time `db:"completed_at"`
}

type GameMoveRow struct {
	ID                  uuid.UUID  `db:"id"`
	GameID              uuid.UUID  `db:"game_id"`
	MoveNumber          int        `db:"move_number"`
	WhiteMove           *string    `db:"white_move"`
	BlackMove           *string    `db:"black_move"`
	WhiteMoveSAN        *string    `db:"white_move_san"`
	BlackMoveSAN        *string    `db:"black_move_san"`
	PositionAfterWhite  *string    `db:"position_after_white"`
	PositionAfterBlack  *string    `db:"position_after_black"`
	TimeTakenWhite      *int       `db:"time_taken_white"`
	TimeTakenBlack      *int       `db:"time_taken_black"`
	EvaluationWhite     *int       `db:"evaluation_white"`
	EvaluationBlack     *int       `db:"evaluation_black"`
	CreatedAt           time.Time  `db:"created_at"`
}

type GameAnalysisRow struct {
	ID                uuid.UUID `db:"id"`
	GameID            uuid.UUID `db:"game_id"`
	PositionFEN       string    `db:"position_fen"`
	Depth             int       `db:"depth"`
	Evaluation        *int      `db:"evaluation"`
	BestMove          *string   `db:"best_move"`
	PrincipalVariation *string   `db:"principal_variation"`
	AnalysisTime      *int      `db:"analysis_time"`
	EngineName        string    `db:"engine_name"`
	EngineVersion     *string   `db:"engine_version"`
	CreatedAt         time.Time `db:"created_at"`
}

func (s *Service) CreateGame(ctx context.Context, gameID, gameType, status, fen string, whitePlayerID, whitePlayerName, blackPlayerID, blackPlayerName *string, currentTurn string, aiDifficulty int) error {
	query := `
		INSERT INTO games (
			game_id, game_type, status, fen, white_player_id, white_player_name,
			black_player_id, black_player_name, current_turn, ai_difficulty
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	
	_, err := s.db.ExecContext(ctx, query,
		gameID,
		gameType,
		status,
		fen,
		whitePlayerID,
		whitePlayerName,
		blackPlayerID,
		blackPlayerName,
		currentTurn,
		aiDifficulty,
	)
	
	return err
}

func (s *Service) UpdateGame(ctx context.Context, gameID, status, fen, currentTurn string, moveCount int, winner, outcome *string, completedAt *time.Time) error {
	query := `
		UPDATE games SET
			status = $2,
			fen = $3,
			current_turn = $4,
			move_count = $5,
			winner = $6,
			outcome = $7,
			completed_at = $8,
			updated_at = NOW()
		WHERE game_id = $1
	`
	
	_, err := s.db.ExecContext(ctx, query,
		gameID,
		status,
		fen,
		currentTurn,
		moveCount,
		winner,
		outcome,
		completedAt,
	)
	
	return err
}

func (s *Service) GetGame(ctx context.Context, gameID string) (*GameRow, error) {
	query := `
		SELECT id, game_id, game_type, status, fen, pgn,
		       white_player_id, white_player_name, black_player_id, black_player_name,
		       current_turn, ai_difficulty, winner, outcome, move_count, time_control,
		       created_at, updated_at, completed_at
		FROM games 
		WHERE game_id = $1
	`
	
	var game GameRow
	err := s.db.QueryRowContext(ctx, query, gameID).Scan(
		&game.ID, &game.GameID, &game.GameType, &game.Status, &game.FEN, &game.PGN,
		&game.WhitePlayerID, &game.WhitePlayerName, &game.BlackPlayerID, &game.BlackPlayerName,
		&game.CurrentTurn, &game.AIDifficulty, &game.Winner, &game.Outcome, &game.MoveCount,
		&game.TimeControl, &game.CreatedAt, &game.UpdatedAt, &game.CompletedAt,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &game, nil
}

func (s *Service) GetGamesByPlayer(ctx context.Context, playerID string, limit, offset int) ([]GameRow, error) {
	query := `
		SELECT id, game_id, game_type, status, fen, pgn,
		       white_player_id, white_player_name, black_player_id, black_player_name,
		       current_turn, ai_difficulty, winner, outcome, move_count, time_control,
		       created_at, updated_at, completed_at
		FROM games 
		WHERE white_player_id = $1 OR black_player_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	
	rows, err := s.db.QueryContext(ctx, query, playerID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var games []GameRow
	for rows.Next() {
		var game GameRow
		err := rows.Scan(
			&game.ID, &game.GameID, &game.GameType, &game.Status, &game.FEN, &game.PGN,
			&game.WhitePlayerID, &game.WhitePlayerName, &game.BlackPlayerID, &game.BlackPlayerName,
			&game.CurrentTurn, &game.AIDifficulty, &game.Winner, &game.Outcome, &game.MoveCount,
			&game.TimeControl, &game.CreatedAt, &game.UpdatedAt, &game.CompletedAt,
		)
		if err != nil {
			return nil, err
		}
		games = append(games, game)
	}
	
	return games, rows.Err()
}

func (s *Service) SaveGameMove(ctx context.Context, gameID uuid.UUID, moveNumber int, whiteMove, blackMove *string, positionAfterWhite, positionAfterBlack *string) error {
	query := `
		INSERT INTO game_moves (
			game_id, move_number, white_move, black_move,
			position_after_white, position_after_black
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (game_id, move_number) DO UPDATE SET
			white_move = EXCLUDED.white_move,
			black_move = EXCLUDED.black_move,
			position_after_white = EXCLUDED.position_after_white,
			position_after_black = EXCLUDED.position_after_black
	`
	
	_, err := s.db.ExecContext(ctx, query,
		gameID, moveNumber, whiteMove, blackMove,
		positionAfterWhite, positionAfterBlack,
	)
	
	return err
}

func (s *Service) GetGameMoves(ctx context.Context, gameID uuid.UUID) ([]GameMoveRow, error) {
	query := `
		SELECT id, game_id, move_number, white_move, black_move,
		       white_move_san, black_move_san, position_after_white, position_after_black,
		       time_taken_white, time_taken_black, evaluation_white, evaluation_black, created_at
		FROM game_moves 
		WHERE game_id = $1
		ORDER BY move_number ASC
	`
	
	rows, err := s.db.QueryContext(ctx, query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var moves []GameMoveRow
	for rows.Next() {
		var move GameMoveRow
		err := rows.Scan(
			&move.ID, &move.GameID, &move.MoveNumber, &move.WhiteMove, &move.BlackMove,
			&move.WhiteMoveSAN, &move.BlackMoveSAN, &move.PositionAfterWhite, &move.PositionAfterBlack,
			&move.TimeTakenWhite, &move.TimeTakenBlack, &move.EvaluationWhite, &move.EvaluationBlack,
			&move.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		moves = append(moves, move)
	}
	
	return moves, rows.Err()
}

func (s *Service) SaveGameAnalysis(ctx context.Context, gameID uuid.UUID, positionFEN string, depth int, evaluation *int, bestMove *string, principalVariation *string) error {
	query := `
		INSERT INTO game_analysis (
			game_id, position_fen, depth, evaluation, best_move, principal_variation
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	
	_, err := s.db.ExecContext(ctx, query,
		gameID, positionFEN, depth, evaluation, bestMove, principalVariation,
	)
	
	return err
}

func (s *Service) GetGameAnalysis(ctx context.Context, gameID uuid.UUID) ([]GameAnalysisRow, error) {
	query := `
		SELECT id, game_id, position_fen, depth, evaluation, best_move,
		       principal_variation, analysis_time, engine_name, engine_version, created_at
		FROM game_analysis 
		WHERE game_id = $1
		ORDER BY created_at DESC
	`
	
	rows, err := s.db.QueryContext(ctx, query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var analyses []GameAnalysisRow
	for rows.Next() {
		var analysis GameAnalysisRow
		err := rows.Scan(
			&analysis.ID, &analysis.GameID, &analysis.PositionFEN, &analysis.Depth,
			&analysis.Evaluation, &analysis.BestMove, &analysis.PrincipalVariation,
			&analysis.AnalysisTime, &analysis.EngineName, &analysis.EngineVersion,
			&analysis.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		analyses = append(analyses, analysis)
	}
	
	return analyses, rows.Err()
}

func (s *Service) DeleteGame(ctx context.Context, gameID string) error {
	query := `DELETE FROM games WHERE game_id = $1`
	
	_, err := s.db.ExecContext(ctx, query, gameID)
	return err
}