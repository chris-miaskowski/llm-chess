import React from 'react';
import './App.css';
import Chessboard from './components/Chessboard';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-4xl font-bold mb-4">Chess Game</h1>
        <Chessboard />
      </header>
    </div>
  );
}

export default App;
