import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Verse { chapter: number; verse: number; text: string; }

const App: React.FC = () => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userId, setUserId] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchProgress();
    } else {
      localStorage.removeItem('token');
    }
    fetchVerses();
  }, [token]);

  const fetchVerses = async () => {
    try {
      const res = await api.get('/api/book/1');
      setVerses(res.data.verses);
    } catch (err) { setError('Failed to load'); }
  };

  const fetchProgress = async () => {
    try {
      const res = await api.get('/api/progress/1');
      setProgress(res.data.verseRead);
    } catch (err) { console.log('No progress'); }
  };

  const saveProgress = async (verse: number) => {
    if (token && userId) {
      await api.put('/api/progress', { bookId: 1, verseRead: verse });
    }
  };

  const handleAuth = async () => {
    setError('');
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const body = isLogin ? { username, password } : { username, email, password };
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, body);
      setToken(res.data.token);
      setUserId(res.data.userId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Auth failed');
    }
  };

  const updatePrefs = async () => {
    if (token && userId) {
      await api.put('/api/preferences', { fontSize, themeColor: theme });
    }
  };

  const styles: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    background: theme === 'light' ? '#fff' : '#222',
    color: theme === 'light' ? '#000' : '#fff',
    padding: '20px',
    minHeight: '100vh'
  };

  return (
    <div style={styles}>
      <h1>Book of Bel and the Dragon</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!token ? (
        <div>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          {!isLogin && <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />}
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
          <button onClick={() => setIsLogin(!isLogin)}>Switch</button>
        </div>
      ) : (
        <div>
          <p>Logged in as user {userId}</p>
          <button onClick={() => { setToken(''); setUserId(null); }}>Logout</button>
          <br />
          <label>Font: <input type="range" min="12" max="28" value={fontSize} onChange={e => { setFontSize(+e.target.value); updatePrefs(); }} /></label>
          <select value={theme} onChange={e => { setTheme(e.target.value); updatePrefs(); }}>
            <option>light</option><option>dark</option>
          </select>
        </div>
      )}

      <div>
        <h2>Progress: Verse {progress > 0 ? progress : 'None'}</h2>
        {verses.map((v, i) => (
          <p key={i} style={{ opacity: i + 1 <= progress ? 0.6 : 1 }}>
            <strong>{v.chapter}:{v.verse}</strong> {v.text}
            {i + 1 > progress && (
              <button onClick={() => { setProgress(i + 1); saveProgress(i + 1); }} style={{ marginLeft: '10px', fontSize: '0.8em' }}>
                Mark Read
              </button>
            )}
          </p>
        ))}
      </div>
    </div>
  );
};

export default App;
