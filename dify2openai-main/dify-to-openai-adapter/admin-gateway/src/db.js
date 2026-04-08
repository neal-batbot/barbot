const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../data.db');

const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const init = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      owner TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER NOT NULL,
      dify_api_key TEXT NOT NULL,
      dify_base_url TEXT NOT NULL,
      model_name TEXT NOT NULL,
      app_type TEXT NOT NULL DEFAULT 'chatbot',
      created_at TEXT NOT NULL,
      FOREIGN KEY(api_key_id) REFERENCES api_keys(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER,
      path TEXT,
      status INTEGER,
      created_at TEXT NOT NULL
    )
  `);
};

module.exports = {
  db,
  init,
  run,
  all,
  get,
};

