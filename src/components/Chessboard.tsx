import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { GameState, Square, Piece, movePiece, isValidMove, checkGameEnd } from '../logic/gameState';
import { getAIMove } from '../services/openai';
import { toast } from 'react-toastify';

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
  notation: string;
}

interface Conversation {
  role: 'user' | 'ai' | 'thinking';
  content: string;
}

const Chessboard: React.FC<ChessboardProps> = ({ initialState, aiSettings, onSaveGame, onExitGame }) => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [highlightedSquares, setHighlightedSquares] = useState<[number, number][]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const conversationRef = useRef<HTMLDivElement>(null);

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

  const getMoveNotation = useCallback((from: [number, number], to: [number, number], piece: Piece, isCapture: boolean): string => {
    const files = 'abcdefgh';
    const fromFile = files[from[1]];
    const toFile = files[to[1]];
    const toRank = 8 - to[0];
    
    let notation = '';
    
    if (piece.type === 'pawn') {
      if (isCapture) {
        notation = `${fromFile}x${toFile}${toRank}`;
      } else {
        notation = `${toFile}${toRank}`;
      }
    } else {
      notation = `${piece.type.toUpperCase()}${isCapture ? 'x' : ''}${toFile}${toRank}`;
    }
    
    // Add check or checkmate symbol if applicable
    const newStatus = checkGameEnd(gameState);
    if (newStatus === 'check') {
      notation += '+';
    } else if (newStatus === 'checkmate') {
      notation += '#';
    }
    
    return notation;
  }, [gameState]);

  const handleAIMove = useCallback(async (newGameState: GameState) => {
    setIsAIThinking(true);
    setConversation(prev => [...prev, { role: 'thinking', content: 'Analyzing the board...' }]);
    try {
      const aiResponse = await getAIMove(
        {
          apiKey: aiSettings.apiKey,
          assistantId: aiSettings.assistantId,
          mode: newGameState.aiMode,
          level: newGameState.aiLevel
        },
        newGameState,
        moveHistory,
        threadId,
        (thought: string) => {
          console.log('AI thought:', thought);
          setConversation(prev => {
            const newConversation = [...prev];
            const lastMessage = newConversation[newConversation.length - 1];
            if (lastMessage.role === 'ai') {
              lastMessage.content += thought;
            } else {
              newConversation.push({ role: 'ai', content: thought });
            }
            return newConversation;
          });
        }
      );
      setThreadId(aiResponse.threadId);
      
      // Parse AI move and update the game state
      console.log("AI move:", aiResponse.move); // Log the AI's move
      const [fromCol, fromRow, toCol, toRow] = aiResponse.move.match(/([a-h])([1-8])([a-h])([1-8])/)?.slice(1) || [];
      if (!fromCol || !fromRow || !toCol || !toRow) {
        throw new Error('Invalid move format from AI');
      }
      const aiFrom: [number, number] = [8 - parseInt(fromRow), fromCol.charCodeAt(0) - 97];
      const aiTo: [number, number] = [8 - parseInt(toRow), toCol.charCodeAt(0) - 97];
      
      if (!isValidMove(newGameState, aiFrom, aiTo)) {
        throw new Error('Invalid move suggested by AI');
      }
      
      const aiNewGameState = movePiece(newGameState, aiFrom, aiTo);
      const aiIsCapture = newGameState.board[aiTo[0]][aiTo[1]] !== null;
      const aiNotation = getMoveNotation(aiFrom, aiTo, newGameState.board[aiFrom[0]][aiFrom[1]]!, aiIsCapture);
      
      setGameState(aiNewGameState);
      setMoveHistory(prev => [...prev, {
        from: aiFrom,
        to: aiTo,
        piece: newGameState.board[aiFrom[0]][aiFrom[1]]!,
        notation: aiNotation
      }]);
      setConversation(prev => {
        const newConversation = prev.filter(msg => msg.role !== 'thinking');
        console.log('AI reasoning:\n', aiResponse.chainOfThoughts);
        newConversation.push({ role: 'ai', content: `Your move :)` });
        return newConversation;
      });

      const aiGameEndResult = checkGameEnd(aiNewGameState);
      if (aiGameEndResult !== 'ongoing') {
        toast.info(`Game Over: ${aiGameEndResult}`);
      }
    } catch (error) {
      console.error('Error getting AI move:', error);
      toast.error('Error: The AI encountered a problem making a move.');
      setConversation(prev => [...prev, { role: 'ai', content: 'Error: The AI encountered a problem making a move.' }]);
    } finally {
      setIsAIThinking(false);
    }
  }, [aiSettings, threadId, getMoveNotation, moveHistory]);

  const handleSquareClick = useCallback(async (row: number, col: number) => {
    if (selectedSquare) {
      if (!isValidMove(gameState, selectedSquare, [row, col])) {
        toast.error("Invalid move!");
        return;
      }

      const newGameState = movePiece(gameState, selectedSquare, [row, col]);
      if (newGameState !== gameState) {
        const isCapture = gameState.board[row][col] !== null;
        const notation = getMoveNotation(selectedSquare, [row, col], gameState.board[selectedSquare[0]][selectedSquare[1]]!, isCapture);
        
        setGameState(newGameState);
        setMoveHistory(prev => [...prev, {
          from: selectedSquare,
          to: [row, col],
          piece: gameState.board[selectedSquare[0]][selectedSquare[1]]!,
          notation: notation
        }]);
        setHighlightedSquares([]);
        setConversation(prev => [...prev, { role: 'user', content: `My move: ${notation}` }]);

        const gameEndResult = checkGameEnd(newGameState);
        if (gameEndResult !== 'ongoing') {
          toast.info(`Game Over: ${gameEndResult}`);
          return;
        }

        // AI's turn
        if (aiSettings.apiKey && aiSettings.assistantId) {
          await handleAIMove(newGameState);
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
  }, [gameState, selectedSquare, aiSettings, highlightValidMoves, getMoveNotation, handleAIMove]);

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
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return (
      <div className="relative">
        <div className="grid grid-cols-8 gap-0">
          {gameState.board.map((row, rowIndex) =>
            row.map((_, colIndex) => renderSquare(rowIndex, colIndex))
          )}
        </div>
        <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-around items-end pr-2">
          {[8, 7, 6, 5, 4, 3, 2, 1].map(num => (
            <div key={num} className="text-xs text-gray-900">{num}</div>
          ))}
        </div>
        <div className="absolute left-0 right-0 bottom-0 flex justify-around items-center pt-2">
          {files.map(file => (
            <div key={file} className="text-xs text-gray-900">{file}</div>
          ))}
        </div>
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
        {Math.floor(index / 2) + 1}. {index % 2 === 0 ? '' : '... '}{move.notation}
      </div>
    ));
  }, [moveHistory]);

  const renderConversation = useCallback(() => {
    return conversation.map((message, index) => (
      <div key={index} className={`p-2 text-left mb-2 rounded ${
        message.role === 'user' 
          ? 'bg-blue-600 text-white' 
          : message.role === 'ai'
          ? 'bg-gray-600 text-gray-200'
          : 'bg-yellow-600 text-white'
      }`}>
        <ReactMarkdown className="text-sm whitespace-pre-wrap break-words">{message.content}</ReactMarkdown>
      </div>
    ));
  }, [conversation]);

  const memoizedBoard = useMemo(() => renderBoard(), [renderBoard]);

  useEffect(() => {
    // Save game state after each move
    onSaveGame(gameState);
  }, [gameState, onSaveGame]);

  useEffect(() => {
    // Scroll to the bottom of the conversation
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleRetryAIMove = useCallback(() => {
    if (gameState.currentPlayer !== 'white' && !isAIThinking) {
      handleAIMove(gameState);
    }
  }, [gameState, isAIThinking, handleAIMove]);

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
          <h3 className="text-lg font-bold mb-2">AI Explanation</h3>
          <div ref={conversationRef} className="h-64 overflow-y-auto border border-gray-600 p-2 rounded mb-4">
            {renderConversation()}
          </div>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
            onClick={handleRetryAIMove}
            disabled={gameState.currentPlayer === 'white' || isAIThinking}
          >
            Your move!
          </button>
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