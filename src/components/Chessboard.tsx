import React, { useState, useMemo, useCallback } from 'react';
import { GameState, Square, Piece, initializeGame, movePiece, isValidMove } from '../logic/gameState';

interface Move {
  from: [number, number];
  to: [number, number];
  piece: Piece;
}

const Chessboard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<[number, number][]>([]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (selectedSquare) {
      const newGameState = movePiece(gameState, selectedSquare, [row, col]);
      if (newGameState !== gameState) {
        setGameState(newGameState);
        setMoveHistory(prev => [...prev, {
          from: selectedSquare,
          to: [row, col],
          piece: gameState.board[selectedSquare[0]][selectedSquare[1]]!
        }]);
        setHighlightedSquares([]);
      }
      setSelectedSquare(null);
    } else {
      const piece = gameState.board[row][col];
      if (piece && piece.color === gameState.currentPlayer) {
        setSelectedSquare([row, col]);
        highlightValidMoves(row, col);
      }
    }
  }, [gameState, selectedSquare]);

  const highlightValidMoves = useCallback((row: number, col: number) => {
    const validMoves: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (isValidMove(gameState, [row, col], [i, j])) {
          validMoves.push([i, j]);
        }
      }
    }
    setHighlightedSquares(validMoves);
  }, [gameState]);

  const renderPiece = useCallback((piece: Square) => {
    if (!piece) return null;
    const pieceSymbol = getPieceSymbol(piece.type);
    return <span className={`text-4xl ${piece.color === 'white' ? 'text-white' : 'text-gray-800'}`}>{pieceSymbol}</span>;
  }, []);

  const renderSquare = useCallback((row: number, col: number) => {
    const isBlack = (row + col) % 2 === 1;
    const squareColor = isBlack ? 'bg-green-700' : 'bg-green-100';
    const isSelected = selectedSquare && selectedSquare[0] === row && selectedSquare[1] === col;
    const isHighlighted = highlightedSquares.some(([r, c]) => r === row && c === col);
    const piece = gameState.board[row][col];
    
    return (
      <div
        key={`${row}-${col}`}
        className={`w-16 h-16 ${squareColor} flex items-center justify-center cursor-pointer 
          ${isSelected ? 'border-4 border-yellow-400' : ''}
          ${isHighlighted ? 'border-4 border-blue-400' : ''}`
        }
        onClick={() => handleSquareClick(row, col)}
      >
        {renderPiece(piece)}
      </div>
    );
  }, [gameState, selectedSquare, highlightedSquares, handleSquareClick, renderPiece]);

  const renderBoard = useCallback(() => {
    const board = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        board.push(renderSquare(row, col));
      }
    }
    return board;
  }, [renderSquare]);

  const getGameStatusMessage = useCallback(() => {
    switch (gameState.status) {
      case 'check':
        return `${gameState.currentPlayer === 'white' ? 'White' : 'Black'} is in check!`;
      case 'checkmate':
        return `Checkmate! ${gameState.currentPlayer === 'white' ? 'Black' : 'White'} wins!`;
      case 'stalemate':
        return 'Stalemate! The game is a draw.';
      default:
        return `Current Turn: ${gameState.currentPlayer === 'white' ? 'White' : 'Black'}`;
    }
  }, [gameState.status, gameState.currentPlayer]);

  const restartGame = useCallback(() => {
    setGameState(initializeGame());
    setSelectedSquare(null);
    setMoveHistory([]);
    setHighlightedSquares([]);
  }, []);

  const renderMoveHistory = useCallback(() => {
    return moveHistory.map((move, index) => (
      <div key={index} className="text-sm">
        {index + 1}. {getPieceSymbol(move.piece.type)} {String.fromCharCode(97 + move.from[1])}{8 - move.from[0]} to {String.fromCharCode(97 + move.to[1])}{8 - move.to[0]}
      </div>
    ));
  }, [moveHistory]);

  const memoizedBoard = useMemo(() => renderBoard(), [renderBoard]);

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8">Chess Game</h1>
      <div className="mb-4 text-2xl font-bold bg-white px-4 py-2 rounded shadow">
        {getGameStatusMessage()}
      </div>
      <div className="flex gap-8">
        <div className="grid grid-cols-8 gap-0 border-4 border-gray-800 rounded-md overflow-hidden shadow-lg">
          {memoizedBoard}
        </div>
        <div className="w-64 bg-white p-4 rounded shadow">
          <h3 className="text-xl font-bold mb-2">Move History</h3>
          <div className="h-96 overflow-y-auto border border-gray-300 p-2 rounded">
            {renderMoveHistory()}
          </div>
        </div>
      </div>
      <button
        className="mt-8 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 shadow-md"
        onClick={restartGame}
      >
        Restart Game
      </button>
    </div>
  );
};

const getPieceSymbol = (pieceType: Piece['type']): string => {
  switch (pieceType) {
    case 'pawn': return '♟';
    case 'rook': return '♜';
    case 'knight': return '♞';
    case 'bishop': return '♝';
    case 'queen': return '♛';
    case 'king': return '♚';
    default: return '';
  }
};

export default Chessboard;