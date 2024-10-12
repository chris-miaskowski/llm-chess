import React, { useState, useEffect } from 'react';
import './App.css';
import HomeScreen from './components/HomeScreen';
import GameSetup from './components/GameSetup';
import Settings from './components/Settings';
import Chessboard from './components/Chessboard';
import { GameState, initializeGame } from './logic/gameState';
import { initializeOpenAI } from './services/openai';

type Screen = 'home' | 'setup' | 'settings' | 'game';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiSettings, setAISettings] = useState({ apiKey: '', assistantId: '' });
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('openaiApiKey');
    const savedAssistantId = localStorage.getItem('openaiAssistantId');
    if (savedApiKey && savedAssistantId) {
      setAISettings({ apiKey: savedApiKey, assistantId: savedAssistantId });
      initializeOpenAI(savedApiKey);
    }
  }, []);

  const handleNewGame = () => {
    setCurrentScreen('setup');
  };

  const handleLoadGame = (gameId: string) => {
    const savedGame = localStorage.getItem(`game_${gameId}`);
    if (savedGame) {
      setGameState(JSON.parse(savedGame));
      setCurrentGameId(gameId);
      setCurrentScreen('game');
    }
  };

  const handleStartGame = (mode: 'player' | 'teacher', level: number) => {
    const newGameState = initializeGame();
    newGameState.aiMode = mode;
    newGameState.aiLevel = level;
    const gameId = Date.now().toString();
    setGameState(newGameState);
    setCurrentGameId(gameId);
    setCurrentScreen('game');
    
    // Save initial game state
    localStorage.setItem(`game_${gameId}`, JSON.stringify(newGameState));
    const games = JSON.parse(localStorage.getItem('chessGames') || '[]');
    games.push({ id: gameId, date: new Date().toLocaleString() });
    localStorage.setItem('chessGames', JSON.stringify(games));
  };

  const handleSaveSettings = (apiKey: string, assistantId: string) => {
    setAISettings({ apiKey, assistantId });
    initializeOpenAI(apiKey);
    localStorage.setItem('openaiApiKey', apiKey);
    localStorage.setItem('openaiAssistantId', assistantId);
    setCurrentScreen('home');
  };

  const handleSaveGame = (state: GameState) => {
    if (currentGameId) {
      localStorage.setItem(`game_${currentGameId}`, JSON.stringify(state));
    }
  };

  const handleExitGame = () => {
    setCurrentGameId(null);
    setGameState(null);
    setCurrentScreen('home');
  };

  return (
    <div className="App">
      {currentScreen === 'home' && (
        <HomeScreen
          onNewGame={handleNewGame}
          onLoadGame={handleLoadGame}
          onOpenSettings={() => setCurrentScreen('settings')}
        />
      )}
      {currentScreen === 'setup' && (
        <GameSetup
          onStartGame={handleStartGame}
          onCancel={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'settings' && (
        <Settings
          initialSettings={aiSettings}
          onSave={handleSaveSettings}
          onCancel={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'game' && gameState && (
        <Chessboard
          initialState={gameState}
          aiSettings={aiSettings}
          onSaveGame={handleSaveGame}
          onExitGame={handleExitGame}
        />
      )}
    </div>
  );
}

export default App;
