import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

interface Verse { chapter: number; verse: number; text: string; }
interface Book { verses: Verse[]; }

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
