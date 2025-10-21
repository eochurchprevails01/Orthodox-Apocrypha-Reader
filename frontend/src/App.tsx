import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';  // Keep default CSS if present

interface Verse {
  chapter: number;
  verse: number;
  text: string;
}

const App: React.FC = () => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  // Fetch book verses on load
  useEffect(() => {
    axios.get('http://localhost:5000/api/book/1')
      .then(res => setVerses(res.data.verses))
      .catch(err => setError('Failed to load verses'));
  }, []);

  // Handle register/login
  const handleAuth = async () => {
    setError('');
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const body = isLogin ? { username, password } : { username, email, password };
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, body);
      setToken(res.data.token || '');
      if (!isLogin) setUserId(res.data.userId);
      else setUserId((await axios.get('http://localhost:5000/api/user', { headers: { Authorization: `Bearer ${res.data.token}` } })).data.userId);  // Placeholder for user ID fetch
    } catch (err: any) {
      setError(err.response?.data?.error || 'Auth failed');
    }
  };

  // Update preferences (call on change)
  const updatePrefs = async () => {
    if (token && userId) {
      try {
        await axios.put('http://localhost:5000/api/preferences', { userId, fontSize, themeColor: theme }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        setError('Preferences update failed');
      }
    }
  };

  // Apply styles
  const styles: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    background: theme === 'light' ? '#fff' : '#333',
    color: theme === 'light' ? '#000' : '#fff',
    padding: '20px',
    minHeight: '100vh'
  };

  return (
    <div style={styles}>
      <h1>Orthodox Apocrypha Reader: Book of Bel and the Dragon</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!token ? (
        <div>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          {!isLogin && <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />}
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
          <button onClick={() => setIsLogin(!isLogin)}>Switch to {isLogin ? 'Register' : 'Login'}</button>
        </div>
      ) : (
        <div>
          <p>Logged in! (Token preview: {token.substring(0, 10)}...)</p>
          <label>
            Font Size: 
            <input 
              type="range" 
              min="12" 
              max="24" 
              value={fontSize} 
              onChange={e => { setFontSize(Number(e.target.value)); updatePrefs(); }} 
            />
            {fontSize}px
          </label>
          <br />
          <label>
            Theme: 
            <select value={theme} onChange={e => { setTheme(e.target.value); updatePrefs(); }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
      )}
      
      <div>
        <h2>Verses</h2>
        {verses.length > 0 ? (
          verses.map((v, i) => (
            <p key={i}>
              <strong>{v.chapter}:{v.verse}</strong> {v.text}
            </p>
          ))
        ) : (
          <p>Loading verses...</p>
        )}
      </div>
    </div>
  );
};

export default App;
