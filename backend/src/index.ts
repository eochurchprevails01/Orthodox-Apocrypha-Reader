import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Types
interface Verse { chapter: number; verse: number; text: string; }
interface Book { verses: Verse[]; }
interface JwtPayload { userId: number; }

// === AUTH MIDDLEWARE ===
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// === ROUTES ===

// Root (for testing)
app.get('/', (req, res) => {
  res.json({ message: 'API Running', endpoints: ['/api/book/1', '/api/register', '/api/login', '/api/preferences', '/api/progress'] });
});

// Fetch Book
app.get('/api/book/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT content FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    const book: Book = JSON.parse(result.rows[0].content);
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hash]
    );
    res.json({ userId: result.rows[0].id });
  } catch (err: any) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username or email taken' });
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token, userId: user.id });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Update Preferences (Protected)
app.put('/api/preferences', authenticate, async (req: any, res) => {
  const { fontSize, themeColor } = req.body;
  const userId = req.userId;
  try {
    await pool.query(
      'INSERT INTO preferences (user_id, font_size, theme_color) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET font_size = $2, theme_color = $3',
      [userId, fontSize, themeColor]
    );
    res.json({ message: 'Preferences updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Save Progress (Protected)
app.put('/api/progress', authenticate, async (req: any, res) => {
  const { bookId, verseRead } = req.body;
  const userId = req.userId;
  try {
    await pool.query(
      'INSERT INTO progress (user_id, book_id, verse_read) VALUES ($1, $2, $3) ON CONFLICT (user_id, book_id) DO UPDATE SET verse_read = $3',
      [userId, bookId, verseRead]
    );
    res.json({ message: 'Progress saved' });
  } catch (err) {
    res.status(500).json({ error: 'Save failed' });
  }
});

// Get Progress (Protected)
app.get('/api/progress/:bookId', authenticate, async (req: any, res) => {
  const { bookId } = req.params;
  const userId = req.userId;
  try {
    const result = await pool.query('SELECT verse_read FROM progress WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
    res.json({ verseRead: result.rows[0]?.verse_read || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
