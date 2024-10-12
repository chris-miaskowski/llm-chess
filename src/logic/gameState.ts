export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PieceColor = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Square = Piece | null;

export interface GameState {
  board: Square[][];
  currentPlayer: PieceColor;
  status: 'ongoing' | 'check' | 'checkmate' | 'stalemate';
}

export const initializeGame = (): GameState => {
  const emptyBoard: Square[][] = Array(8).fill(null).map(() => Array(8).fill(null));

  // Initialize pawns
  for (let i = 0; i < 8; i++) {
    emptyBoard[1][i] = { type: 'pawn', color: 'black' };
    emptyBoard[6][i] = { type: 'pawn', color: 'white' };
  }

  // Initialize other pieces
  const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let i = 0; i < 8; i++) {
    emptyBoard[0][i] = { type: backRank[i], color: 'black' };
    emptyBoard[7][i] = { type: backRank[i], color: 'white' };
  }

  return {
    board: emptyBoard,
    currentPlayer: 'white',
    status: 'ongoing',
  };
};

const isValidPawnMove = (from: [number, number], to: [number, number], piece: Piece, board: Square[][]): boolean => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const direction = piece.color === 'white' ? -1 : 1;

  // Move forward one square
  if (fromCol === toCol && toRow === fromRow + direction && !board[toRow][toCol]) {
    return true;
  }

  // Move forward two squares from starting position
  if (
    fromCol === toCol &&
    ((piece.color === 'white' && fromRow === 6 && toRow === 4) || (piece.color === 'black' && fromRow === 1 && toRow === 3)) &&
    !board[fromRow + direction][fromCol] &&
    !board[toRow][toCol]
  ) {
    return true;
  }

  // Capture diagonally
  if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && board[toRow][toCol] && board[toRow][toCol]?.color !== piece.color) {
    return true;
  }

  return false;
};

const isValidRookMove = (from: [number, number], to: [number, number], board: Square[][]): boolean => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  if (fromRow !== toRow && fromCol !== toCol) {
    return false;
  }

  const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
  const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);

  for (let i = 1; i < Math.max(Math.abs(toRow - fromRow), Math.abs(toCol - fromCol)); i++) {
    if (board[fromRow + i * rowStep][fromCol + i * colStep]) {
      return false;
    }
  }

  return true;
};

const isValidKnightMove = (from: [number, number], to: [number, number]): boolean => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
};

const isValidBishopMove = (from: [number, number], to: [number, number], board: Square[][]): boolean => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) {
    return false;
  }

  const rowStep = (toRow - fromRow) / Math.abs(toRow - fromRow);
  const colStep = (toCol - fromCol) / Math.abs(toCol - fromCol);

  for (let i = 1; i < Math.abs(toRow - fromRow); i++) {
    if (board[fromRow + i * rowStep][fromCol + i * colStep]) {
      return false;
    }
  }

  return true;
};

const isValidQueenMove = (from: [number, number], to: [number, number], board: Square[][]): boolean => {
  return isValidRookMove(from, to, board) || isValidBishopMove(from, to, board);
};

const isValidKingMove = (from: [number, number], to: [number, number]): boolean => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  return rowDiff <= 1 && colDiff <= 1;
};

export const isValidMove = (gameState: GameState, from: [number, number], to: [number, number]): boolean => {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  const piece = gameState.board[fromRow][fromCol];
  const destination = gameState.board[toRow][toCol];

  if (!piece || piece.color !== gameState.currentPlayer) {
    return false;
  }

  if (destination && destination.color === piece.color) {
    return false;
  }

  switch (piece.type) {
    case 'pawn':
      return isValidPawnMove(from, to, piece, gameState.board);
    case 'rook':
      return isValidRookMove(from, to, gameState.board);
    case 'knight':
      return isValidKnightMove(from, to);
    case 'bishop':
      return isValidBishopMove(from, to, gameState.board);
    case 'queen':
      return isValidQueenMove(from, to, gameState.board);
    case 'king':
      return isValidKingMove(from, to);
    default:
      return false;
  }
};

const isKingInCheck = (board: Square[][], kingColor: PieceColor): boolean => {
  let kingPosition: [number, number] | null = null;

  // Find the king's position
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === kingColor) {
        kingPosition = [row, col];
        break;
      }
    }
    if (kingPosition) break;
  }

  if (!kingPosition) return false;

  // Check if any opponent's piece can capture the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color !== kingColor) {
        if (isValidMove({ board, currentPlayer: piece.color, status: 'ongoing' }, [row, col], kingPosition)) {
          return true;
        }
      }
    }
  }

  return false;
};

const isCheckmate = (gameState: GameState): boolean => {
  const { board, currentPlayer } = gameState;

  // If the current player's king is not in check, it's not checkmate
  if (!isKingInCheck(board, currentPlayer)) {
    return false;
  }

  // Check all possible moves for the current player
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece.color === currentPlayer) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(gameState, [fromRow, fromCol], [toRow, toCol])) {
              // Make the move
              const newBoard = board.map(row => [...row]);
              newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
              newBoard[fromRow][fromCol] = null;

              // Check if the king is still in check after the move
              if (!isKingInCheck(newBoard, currentPlayer)) {
                return false; // Found a valid move that gets out of check
              }
            }
          }
        }
      }
    }
  }

  return true; // No valid moves found to get out of check
};

const isStalemate = (gameState: GameState): boolean => {
  const { board, currentPlayer } = gameState;

  // If the current player's king is in check, it's not stalemate
  if (isKingInCheck(board, currentPlayer)) {
    return false;
  }

  // Check if the current player has any valid moves
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece.color === currentPlayer) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(gameState, [fromRow, fromCol], [toRow, toCol])) {
              return false; // Found a valid move
            }
          }
        }
      }
    }
  }

  return true; // No valid moves found
};

export const movePiece = (gameState: GameState, from: [number, number], to: [number, number]): GameState => {
  if (!isValidMove(gameState, from, to)) {
    return gameState;
  }

  const newBoard = gameState.board.map(row => [...row]);
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
  newBoard[fromRow][fromCol] = null;

  const newPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
  const newGameState: GameState = {
    board: newBoard,
    currentPlayer: newPlayer,
    status: 'ongoing',
  };

  if (isKingInCheck(newBoard, newPlayer)) {
    if (isCheckmate(newGameState)) {
      newGameState.status = 'checkmate';
    } else {
      newGameState.status = 'check';
    }
  } else if (isStalemate(newGameState)) {
    newGameState.status = 'stalemate';
  }

  return newGameState;
};