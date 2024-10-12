import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GameState, Square, Piece, movePiece, isValidMove } from '../logic/gameState';
import { getAIMove } from '../services/openai';

interface ChessboardProps {
  initialState: GameState;
  aiSettings: { apiKey: string; assistantId: string };
  onSaveGame: (state: GameState) => void;
  onExitGame: () => void;
}

interface Move {
  from: [number, number];
  to: [number, number];
  piece: Piece;
}

const Chessboard: React.FC<ChessboardProps> = ({ initialState, aiSettings, onSaveGame, onExitGame }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<[number, number][]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [aiExplanation, setAIExplanation] = useState<string>('');
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);

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

  const handleSquareClick = useCallback(async (row: number, col: number) => {
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

        // AI's turn
        if (aiSettings.apiKey && aiSettings.assistantId) {
          setIsAIThinking(true);
          try {
            const aiResponse = await getAIMove({
              apiKey: aiSettings.apiKey,
              assistantId: aiSettings.assistantId,
              mode: newGameState.aiMode,
              level: newGameState.aiLevel
            }, newGameState, threadId);
            setThreadId(aiResponse.threadId);
            setAIExplanation(aiResponse.explanation);
            
            // Parse AI move and update the game state
            console.log("AI move:", aiResponse.move); // Log the AI's move
            const [fromCol, fromRow, toCol, toRow] = aiResponse.move.split('');
            if (!fromCol || !fromRow || !toCol || !toRow) {
              throw new Error('Invalid move format from AI');
            }
            const aiFrom: [number, number] = [8 - parseInt(fromRow), fromCol.charCodeAt(0) - 97];
            const aiTo: [number, number] = [8 - parseInt(toRow), toCol.charCodeAt(0) - 97];
            const aiNewGameState = movePiece(newGameState, aiFrom, aiTo);
            setGameState(aiNewGameState);
            setMoveHistory(prev => [...prev, {
              from: aiFrom,
              to: aiTo,
              piece: newGameState.board[aiFrom[0]][aiFrom[1]]!
            }]);
          } catch (error) {
            console.error('Error getting AI move:', error);
            setAIExplanation('Error: The AI encountered a problem making a move.');
          } finally {
            setIsAIThinking(false);
          }
        }
      }
      setSelectedSquare(null);
    } else {
      const piece = gameState.board[row][col];
      if (piece && piece.color === gameState.currentPlayer) {
        setSelectedSquare([row, col]);
        highlightValidMoves(row, col);
      }
    }
  }, [gameState, selectedSquare, aiSettings, threadId, highlightValidMoves]);

  const renderPiece = useCallback((piece: Square) => {
    if (!piece) return null;
    const pieceSymbol = getPieceSymbol(piece.type);
    return <span className={`text-4xl ${piece.color === 'white' ? 'text-gray-200' : 'text-gray-800'}`}>{pieceSymbol}</span>;
  }, []);

  const renderSquare = useCallback((row: number, col: number) => {
    const isBlack = (row + col) % 2 === 1;
    const squareColor = isBlack ? 'bg-gray-500' : 'bg-gray-400';
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
    return (
      <div className="grid grid-cols-8 gap-0">
        {gameState.board.map((row, rowIndex) =>
          row.map((_, colIndex) => renderSquare(rowIndex, colIndex))
        )}
      </div>
    );
  }, [gameState.board, renderSquare]);

  const getGameStatusMessage = useCallback(() => {
    if (isAIThinking) {
      return "AI is thinking...";
    }
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
  }, [gameState.status, gameState.currentPlayer, isAIThinking]);

  const renderMoveHistory = useCallback(() => {
    return moveHistory.map((move, index) => (
      <div key={index} className="text-sm text-gray-300">
        {index + 1}. {getPieceSymbol(move.piece.type)} {String.fromCharCode(97 + move.from[1])}{8 - move.from[0]} to {String.fromCharCode(97 + move.to[1])}{8 - move.to[0]}
      </div>
    ));
  }, [moveHistory]);

  const memoizedBoard = useMemo(() => renderBoard(), [renderBoard]);

  useEffect(() => {
    // Save game state after each move
    onSaveGame(gameState);
  }, [gameState, onSaveGame]);

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 min-h-screen text-white">
      <div className="mb-4 text-2xl font-bold bg-gray-700 px-4 py-2 rounded shadow">
        {getGameStatusMessage()}
      </div>
      <div className="flex gap-8">
        <div className="border-4 border-gray-600 rounded-md overflow-hidden shadow-lg">
          {memoizedBoard}
        </div>
        <div className="w-96 bg-gray-700 p-4 rounded shadow">
          <h3 className="text-xl font-bold mb-2">Move History</h3>
          <div className="h-64 overflow-y-auto border border-gray-600 p-2 rounded mb-4">
            {renderMoveHistory()}
          </div>
          <h3 className="text-xl font-bold mb-2">AI Explanation</h3>
          <div className="h-64 overflow-y-auto border border-gray-600 p-2 rounded">
            {aiExplanation}
          </div>
        </div>
      </div>
      <div className="mt-8">
        <button
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 shadow-md"
          onClick={onExitGame}
        >
          Exit Game
        </button>
      </div>
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