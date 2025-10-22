import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Verse { chapter: number; verse: number; text: string; }
interface Chapter { chapter: number; verses: Verse[]; }
interface Book { id: number; title: string; chapters: Chapter[]; }

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<number>(1);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
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
  const [progress, setProgress] = useState<{ [bookId: number]: number }>({});

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchBooks();
      fetchProgress(selectedBook);
    } else {
      localStorage.removeItem('token');
    }
  }, [token, selectedBook]);

  const fetchBooks = async () => {
    try {
      const res = await api.get('/api/books');
      setBooks(res.data || []);
    } catch (err) {
      setError('Failed to load books');
      console.error(err);
    }
  };

  const fetchChapter = async () => {
    try {
      const res = await api.get('/api/book/' + selectedBook);
      const chapter = res.data.chapters.find((c: Chapter) => c.chapter === selectedChapter);
      setVerses(chapter ? chapter.verses : []);
    } catch (err) {
      setError('Failed to load chapter');
      console.error(err);
    }
  };

  const fetchProgress = async (bookId: number) => {
    try {
      const res = await api.get('/api/progress/book/' + bookId);
      setProgress((prev) => ({ ...prev, [bookId]: res.data.chapterCompleted || 0 }));
    } catch (err) {
      console.error('Progress fetch failed');
    }
  };

  const markChapterCompleted = async () => {
    try {
      await api.put('/api/progress/book/' + selectedBook + '/chapter/' + selectedChapter);
      setProgress((prev) => ({ ...prev, [selectedBook]: selectedChapter }));
      const book = books.find((b) => b.id === selectedBook);
      const chapterLength = book?.chapters.length ?? 0;
      if (selectedChapter < chapterLength) {
        setSelectedChapter(selectedChapter + 1);
      } else {
        const nextBookIndex = books.findIndex((b) => b.id === selectedBook) + 1;
        if (nextBookIndex < books.length) {
          setSelectedBook(books[nextBookIndex].id);
          setSelectedChapter(1);
        }
      }
    } catch (err) {
      setError('Failed to save progress');
      console.error(err);
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
      try {
        await api.put('/api/preferences', { fontSize, themeColor: theme });
      } catch (err) {
        setError('Preferences update failed');
        console.error(err);
      }
    }
  };

  const styles: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    background: theme === 'light' ? '#fff' : '#333',
    color: theme === 'light' ? '#000' : '#fff',
    padding: '20px',
    minHeight: '100vh',
  };

  return (
    <div style={styles}>
      <h1>Orthodox Apocrypha Reader</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!token ? (
        <div>
          <h2>{isLogin ? 'Login' : 'Register'}</h2>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          {!isLogin && <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleAuth}>{isLogin ? 'Login' : 'Register'}</button>
          <button onClick={() => setIsLogin(!isLogin)}>Switch to {isLogin ? 'Register' : 'Login'}</button>
        </div>
      ) : (
        <div>
          <p>Logged in as user {userId}</p>
          <button onClick={() => { setToken(''); setUserId(null); }}>Logout</button>
          <label>Font Size: <input type="range" min="12" max="24" value={fontSize} onChange={(e) => { setFontSize(Number(e.target.value)); updatePrefs(); }} /></label>
          <select value={theme} onChange={(e) => { setTheme(e.target.value); updatePrefs(); }}>
            <option>light</option>
            <option>dark</option>
          </select>
          <h2>Select Book</h2>
          <select value={selectedBook} onChange={(e) => setSelectedBook(Number(e.target.value))}>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} {progress[b.id] >= (b.chapters?.length || 0) ? '(Completed)' : ''}
              </option>
            ))}
          </select>
          <h2>Select Chapter</h2>
          <select value={selectedChapter} onChange={(e) => setSelectedChapter(Number(e.target.value))}>
            {books.find((b) => b.id === selectedBook)?.chapters.map((c) => (
              <option key={c.chapter} value={c.chapter}>
                Chapter {c.chapter} {progress[selectedBook] >= c.chapter ? '(Completed)' : ''}
              </option>
            )) ?? []}
          </select>
        </div>
      )}

      {token && (
        <div>
          <h2>Verses</h2>
          {verses.map((v, i) => (
            <p key={i}><strong>{v.chapter}:{v.verse}</strong> {v.text}</p>
          ))}
          <button onClick={markChapterCompleted}>Finish Chapter and Go Next</button>
        </div>
      )}
    </div>
  );
};

export default App;