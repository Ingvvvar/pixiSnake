-- Выполняется автоматически при первом старте контейнера db
-- (docker-entrypoint-initdb.d); на существующей базе не запускается,
-- поэтому всё через IF NOT EXISTS
CREATE TABLE IF NOT EXISTS scores (
  id serial PRIMARY KEY,
  name text NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- под запрос таблицы лидеров: ORDER BY score DESC LIMIT 10
CREATE INDEX IF NOT EXISTS scores_score_desc_idx ON scores (score DESC);
