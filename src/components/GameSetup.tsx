import React, { useState } from 'react';

interface GameSetupProps {
  onStartGame: (mode: 'player' | 'teacher', level: number) => void;
  onCancel: () => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, onCancel }) => {
  const [mode, setMode] = useState<'player' | 'teacher'>('player');
  const [level, setLevel] = useState<number>(1);

  const handleStartGame = () => {
    onStartGame(mode, level);
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 min-h-screen text-white">
      <h2 className="text-3xl font-bold mb-6">New Game Setup</h2>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'player' | 'teacher')}
            className="w-64 p-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
          >
            <option value="player">Player</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(parseInt(e.target.value))}
            className="w-64 p-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
          >
            <option value="1">Beginner</option>
            <option value="2">Intermediate</option>
            <option value="3">Advanced</option>
            <option value="4">Expert</option>
            <option value="5">Master</option>
          </select>
        </div>
      </div>
      <div className="space-x-4">
        <button
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 shadow-md"
          onClick={handleStartGame}
        >
          Start Game
        </button>
        <button
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 shadow-md"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default GameSetup;