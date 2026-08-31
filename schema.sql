-- Loki's Kitchen schema

CREATE TABLE IF NOT EXISTS recipes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  image_url       TEXT,
  ready_minutes   INTEGER,
  servings        INTEGER,
  source_url      TEXT,
  source_name     TEXT,
  ingredients     TEXT    NOT NULL DEFAULT '[]',  -- json: [{name, amount, unit, original}]
  instructions    TEXT    NOT NULL DEFAULT '[]',  -- json: ["step one", "step two"]
  summary         TEXT,
  notes           TEXT,
  spoonacular_id  INTEGER UNIQUE,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#8a9a5b'
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS spins (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  spun_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_spins_recipe  ON spins(recipe_id);
CREATE INDEX IF NOT EXISTS idx_spins_when    ON spins(spun_at DESC);
CREATE INDEX IF NOT EXISTS idx_rt_recipe     ON recipe_tags(recipe_id);
CREATE INDEX IF NOT EXISTS idx_rt_tag        ON recipe_tags(tag_id);

INSERT OR IGNORE INTO tags (name, color) VALUES
  ('quick',    '#d98d43'),
  ('veggie',   '#7a9a4e'),
  ('comfort',  '#c4614f'),
  ('healthy',  '#5f9e7d'),
  ('cheat',    '#b5527a'),
  ('fancy',    '#9a7bbd');
