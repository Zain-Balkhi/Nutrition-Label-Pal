import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Check backend health on mount
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Backend not connected:', err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Nutrition Label Pal</h1>
        <p>Get nutritional information for your recipes</p>
        {health && (
          <div className="status">
            Backend Status: <span className="status-ok">{health.status}</span>
          </div>
        )}
      </header>
      
      <main className="App-main">
        <div className="container">
          <h2>Welcome!</h2>
          <p>This is a simple frontend for the Nutrition Label Pal application.</p>
          <p>The backend API is ready to process recipes and fetch nutritional data.</p>
        </div>
      </main>
    </div>
  );
}

export default App;
