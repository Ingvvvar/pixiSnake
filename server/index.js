require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// По умолчанию только loopback (хост-версия под PM2); в контейнере компоуз
// задаёт HOST=0.0.0.0, иначе проброшенный порт не достучится до процесса
const HOST = process.env.HOST || '127.0.0.1';
const PORT = 3000;
const MAX_NAME_LENGTH = 20;
const MAX_SCORE = 1_000_000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ошибка на простаивающем соединении (обрыв сети, рестарт базы) без обработчика
// роняет процесс целиком — логируем, pool сам пересоздаст соединение
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT name, score FROM scores ORDER BY score DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch leaderboard', err);
    res.status(503).json({ error: 'database unavailable' });
  }
});

app.post('/api/score', async (req, res) => {
  const { name, score } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: `name must be a non-empty string up to ${MAX_NAME_LENGTH} characters` });
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return res.status(400).json({ error: `score must be an integer between 0 and ${MAX_SCORE}` });
  }

  try {
    await pool.query(
      'INSERT INTO scores (name, score) VALUES ($1, $2)',
      [name.trim(), score]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Failed to save score', err);
    res.status(503).json({ error: 'database unavailable' });
  }
});

// Malformed JSON body → JSON 400 instead of the default HTML error page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  next(err);
});

app.listen(PORT, HOST, () => {
  console.log(`Leaderboard API listening on http://${HOST}:${PORT}`);
});
