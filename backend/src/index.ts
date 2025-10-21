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

// Route: Fetch Book by ID (SQL SELECT + JSON parse)
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

// Route: User Registration (SQL INSERT with bcrypt hash)
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hash]
    );
    res.json({ userId: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Route: User Login (SQL SELECT + bcrypt compare + JWT)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
