const express = require('express');

const app = express();
app.use(express.json());

const HOST = '127.0.0.1';
const PORT = 3000;
const MAX_NAME_LENGTH = 20;
const MAX_SCORE = 1_000_000;

// In-memory storage; resets on restart
const scores = [];

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/leaderboard', (req, res) => {
  const top = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(top);
});

app.post('/api/score', (req, res) => {
  const { name, score } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: `name must be a non-empty string up to ${MAX_NAME_LENGTH} characters` });
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return res.status(400).json({ error: `score must be an integer between 0 and ${MAX_SCORE}` });
  }

  scores.push({ name: name.trim(), score });
  res.status(201).json({ ok: true });
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
