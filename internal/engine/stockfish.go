package engine

import (
	"bufio"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type StockfishEngine struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
	reader *bufio.Scanner
}

type MoveResponse struct {
	Move       string
	Evaluation int
	Depth      int
	Time       time.Duration
}

func NewStockfish() (*StockfishEngine, error) {
	// Try to find stockfish executable
	stockfishPaths := []string{"stockfish", "/usr/local/bin/stockfish", "/opt/homebrew/bin/stockfish"}
	
	var cmd *exec.Cmd
	for _, path := range stockfishPaths {
		if _, err := exec.LookPath(path); err == nil {
			cmd = exec.Command(path)
			break
		}
	}
	
	if cmd == nil {
		return nil, fmt.Errorf("stockfish executable not found. Please install Stockfish")
	}
	
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %v", err)
	}
	
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %v", err)
	}
	
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start stockfish: %v", err)
	}
	
	engine := &StockfishEngine{
		cmd:    cmd,
		stdin:  stdin,
		stdout: stdout,
		reader: bufio.NewScanner(stdout),
	}
	
	// Initialize UCI mode
	if err := engine.sendCommand("uci"); err != nil {
		engine.Close()
		return nil, fmt.Errorf("failed to initialize UCI: %v", err)
	}
	
	// Wait for uciok
	for engine.reader.Scan() {
		line := engine.reader.Text()
		if line == "uciok" {
			break
		}
	}
	
	// Set up engine
	if err := engine.sendCommand("ucinewgame"); err != nil {
		engine.Close()
		return nil, fmt.Errorf("failed to start new game: %v", err)
	}
	
	log.Println("Stockfish engine initialized successfully")
	return engine, nil
}

func (e *StockfishEngine) sendCommand(command string) error {
	if _, err := e.stdin.Write([]byte(command + "\n")); err != nil {
		return fmt.Errorf("failed to send command '%s': %v", command, err)
	}
	return nil
}

func (e *StockfishEngine) GetBestMove(fen string, depth int, timeLimit time.Duration) (*MoveResponse, error) {
	// Set position
	if err := e.sendCommand(fmt.Sprintf("position fen %s", fen)); err != nil {
		return nil, err
	}
	
	// Start analysis with time limit and depth
	goCommand := fmt.Sprintf("go depth %d movetime %d", depth, int(timeLimit.Milliseconds()))
	if err := e.sendCommand(goCommand); err != nil {
		return nil, err
	}
	
	var bestMove string
	var evaluation int
	var actualDepth int
	startTime := time.Now()
	
	// Parse engine output
	for e.reader.Scan() {
		line := e.reader.Text()
		
		// Parse info lines for evaluation
		if strings.HasPrefix(line, "info") {
			if strings.Contains(line, "score cp") {
				parts := strings.Fields(line)
				for i, part := range parts {
					if part == "cp" && i+1 < len(parts) {
						if eval, err := strconv.Atoi(parts[i+1]); err == nil {
							evaluation = eval
						}
					}
					if part == "depth" && i+1 < len(parts) {
						if d, err := strconv.Atoi(parts[i+1]); err == nil {
							actualDepth = d
						}
					}
				}
			}
		}
		
		// Parse best move
		if strings.HasPrefix(line, "bestmove") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				bestMove = parts[1]
			}
			break
		}
	}
	
	if bestMove == "" {
		return nil, fmt.Errorf("no best move received from engine")
	}
	
	return &MoveResponse{
		Move:       bestMove,
		Evaluation: evaluation,
		Depth:      actualDepth,
		Time:       time.Since(startTime),
	}, nil
}

func (e *StockfishEngine) SetDifficulty(level int) error {
	// Level 0-20, where 0 is easiest and 20 is strongest
	if level < 0 || level > 20 {
		level = 10 // Default to medium difficulty
	}
	
	// Set skill level
	if err := e.sendCommand(fmt.Sprintf("setoption name Skill Level value %d", level)); err != nil {
		return err
	}
	
	// Adjust time based on difficulty
	var depth int
	switch {
	case level <= 5:
		depth = 1 // Very easy
	case level <= 10:
		depth = 3 // Easy to medium
	case level <= 15:
		depth = 8 // Medium to hard
	default:
		depth = 15 // Very hard
	}
	
	return e.sendCommand(fmt.Sprintf("setoption name Depth value %d", depth))
}

func (e *StockfishEngine) AnalyzePosition(fen string, lines int, depth int) ([]MoveResponse, error) {
	if err := e.sendCommand(fmt.Sprintf("position fen %s", fen)); err != nil {
		return nil, err
	}
	
	if err := e.sendCommand(fmt.Sprintf("go depth %d", depth)); err != nil {
		return nil, err
	}
	
	var moves []MoveResponse
	
	for e.reader.Scan() {
		line := e.reader.Text()
		
		if strings.HasPrefix(line, "bestmove") {
			break
		}
		
		// Parse multipv lines for multiple best moves
		if strings.Contains(line, "multipv") {
			// This would need more complex parsing for multiple lines
			// For now, we'll just return the single best move
		}
	}
	
	return moves, nil
}

func (e *StockfishEngine) IsRunning() bool {
	return e.cmd != nil && e.cmd.Process != nil
}

func (e *StockfishEngine) Close() error {
	if e.stdin != nil {
		e.sendCommand("quit")
		e.stdin.Close()
	}
	
	if e.stdout != nil {
		e.stdout.Close()
	}
	
	if e.cmd != nil && e.cmd.Process != nil {
		if err := e.cmd.Process.Kill(); err != nil {
			return err
		}
		e.cmd.Wait()
	}
	
	return nil
}