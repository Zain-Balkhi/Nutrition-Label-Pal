import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [inputText, setInputText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check backend health on mount
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('Backend not connected:', err));
  }, []);

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setMessage('Please enter some text');
      return;
    }

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        setInputText('');
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch (err) {
      setMessage('Error connecting to backend');
      console.error('Error:', err);
    }
  };

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
          <h2>Generate Recipe</h2>
          <p>Enter your recipe or text below:</p>
          
          <div className="input-group">
            <textarea
              className="text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your recipe text here..."
              rows="6"
            />
          </div>
          
          <button className="generate-btn" onClick={handleGenerate}>
            Generate
          </button>
          
          {message && (
            <div className={`message ${message.includes('Error') || message.includes('Failed') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
