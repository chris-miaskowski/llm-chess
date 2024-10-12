import React, { useState, useEffect } from 'react';

interface HomeScreenProps {
  onNewGame: () => void;
  onLoadGame: (gameId: string) => void;
  onOpenSettings: () => void;
}

interface SavedGame {
  id: string;
  date: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNewGame, onLoadGame, onOpenSettings }) => {
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);

  useEffect(() => {
    const games = localStorage.getItem('chessGames');
    if (games) {
      const parsedGames = JSON.parse(games);
      // Remove duplicate games based on id
      const uniqueGames = parsedGames.filter((game: SavedGame, index: number, self: SavedGame[]) =>
        index === self.findIndex((t) => t.id === game.id)
      );
      setSavedGames(uniqueGames);
    }
  }, []);

  const handleDeleteGame = (gameId: string) => {
    const updatedGames = savedGames.filter(game => game.id !== gameId);
    setSavedGames(updatedGames);
    localStorage.setItem('chessGames', JSON.stringify(updatedGames));
    localStorage.removeItem(`game_${gameId}`);
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-8">AI Chess Game</h1>
      <div className="space-y-4">
        <button
          className="w-64 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 shadow-md"
          onClick={onNewGame}
        >
          New Game
        </button>
        <button
          className="w-64 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 shadow-md"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
      {savedGames.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Previous Games</h2>
          <div className="space-y-2">
            {savedGames.map((game) => (
              <div key={game.id} className="flex items-center space-x-2">
                <button
                  className="w-64 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 shadow-md"
                  onClick={() => onLoadGame(game.id)}
                >
                  {game.date}
                </button>
                <button
                  className="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 shadow-md"
                  onClick={() => handleDeleteGame(game.id)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;