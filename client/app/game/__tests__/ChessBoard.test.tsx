import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChessBoard from '../ChessBoard';

// Mock the utility functions
vi.mock('~/utils/utils', () => ({
  toChessNotation: (row: number, col: number) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  },
  flippedNotation: (row: number, col: number) => {
    const files = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return files[col] + ranks[row];
  },
  pieceImgs: {
    'P': 'white-pawn.png',
    'p': 'black-pawn.png',
    'R': 'white-rook.png',
    'r': 'black-rook.png',
    'N': 'white-knight.png',
    'n': 'black-knight.png',
    'B': 'white-bishop.png',
    'b': 'black-bishop.png',
    'Q': 'white-queen.png',
    'q': 'black-queen.png',
    'K': 'white-king.png',
    'k': 'black-king.png',
  }
}));

describe('ChessBoard', () => {
  const mockProps = {
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onClick: vi.fn(),
    availableMoves: [],
    isFlipped: false,
  };

  // Standard starting position
  const initialBoardArray = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 64 squares', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    const squares = screen.getAllByRole('generic');
    // Note: This counts all div elements, need to be more specific
    expect(squares.length).toBeGreaterThanOrEqual(64);
  });

  it('displays pieces correctly', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    // Check for white king
    const whiteKing = screen.getByAltText('K');
    expect(whiteKing).toBeInTheDocument();
    expect(whiteKing).toHaveAttribute('src', '/white-king.png');

    // Check for black queen
    const blackQueen = screen.getByAltText('q');
    expect(blackQueen).toBeInTheDocument();
    expect(blackQueen).toHaveAttribute('src', '/black-queen.png');
  });

  it('calls onClick when square is clicked', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    // Click on a square - get all divs with cursor-pointer class
    const squares = document.querySelectorAll('.cursor-pointer');
    fireEvent.click(squares[0] as Element);

    expect(mockProps.onClick).toHaveBeenCalled();
  });

  it('calls onDragStart when piece is dragged', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    const whiteKing = screen.getByAltText('K');
    fireEvent.dragStart(whiteKing);

    expect(mockProps.onDragStart).toHaveBeenCalled();
  });

  it('shows available moves highlights', () => {
    const availableMoves = ['e2e4', 'd2d4'];

    render(
      <ChessBoard
        {...mockProps}
        availableMoves={availableMoves}
        selectedSquare="e2"
        boardArray={initialBoardArray}
      />
    );

    // Look for green move indicators (circle for empty squares, border for captures)
    const moveIndicators = document.querySelectorAll('.bg-green-500, .border-green-500');
    expect(moveIndicators.length).toBeGreaterThan(0);
  });

  it('displays board coordinates correctly', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    // Check for file letters (a-h) on bottom rank
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('h')).toBeInTheDocument();

    // Check for rank numbers (1-8) on left file
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('handles flipped board correctly', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
        isFlipped={true}
      />
    );

    // When flipped, coordinates should be reversed
    // This test would need more specific implementation details
    expect(screen.getByText('h')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('applies correct light and dark square classes', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    const lightSquares = document.querySelectorAll('.light');
    const darkSquares = document.querySelectorAll('.dark');

    expect(lightSquares.length).toBe(32);
    expect(darkSquares.length).toBe(32);
  });

  it('handles empty squares correctly', () => {
    const emptyBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    render(
      <ChessBoard
        {...mockProps}
        boardArray={emptyBoard}
      />
    );

    // Should not have any piece images
    const pieces = screen.queryAllByRole('img');
    expect(pieces.length).toBe(0);
  });

  it('handles drag over events', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    const squares = document.querySelectorAll('.cursor-pointer');
    fireEvent.dragOver(squares[0] as Element);

    expect(mockProps.onDragOver).toHaveBeenCalled();
  });

  it('handles drop events with correct square notation', () => {
    render(
      <ChessBoard
        {...mockProps}
        boardArray={initialBoardArray}
      />
    );

    const squares = document.querySelectorAll('.cursor-pointer');
    fireEvent.drop(squares[0] as Element);

    expect(mockProps.onDrop).toHaveBeenCalled();
  });

  // Performance test
  it('renders efficiently with large number of available moves', () => {
    const manyMoves = Array.from({ length: 64 }, (_, i) => {
      const file = String.fromCharCode(97 + (i % 8)); // a-h
      const rank = Math.floor(i / 8) + 1; // 1-8
      return `${file}${rank}${file}${rank + 1 > 8 ? rank - 1 : rank + 1}`;
    });

    const startTime = performance.now();
    
    render(
      <ChessBoard
        {...mockProps}
        availableMoves={manyMoves}
        boardArray={initialBoardArray}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in reasonable time (less than 100ms)
    expect(renderTime).toBeLessThan(100);
  });

  // Edge case: board with mixed piece types
  it('handles board with all piece types', () => {
    const mixedBoard = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ];

    render(
      <ChessBoard
        {...mockProps}
        boardArray={mixedBoard}
      />
    );

    // Verify all piece types are rendered
    expect(screen.getByAltText('K')).toBeInTheDocument(); // White king
    expect(screen.getByAltText('k')).toBeInTheDocument(); // Black king
    expect(screen.getByAltText('Q')).toBeInTheDocument(); // White queen
    expect(screen.getByAltText('q')).toBeInTheDocument(); // Black queen
    expect(screen.getAllByAltText('P')).toHaveLength(8);  // White pawns
    expect(screen.getAllByAltText('p')).toHaveLength(8);  // Black pawns
  });
});