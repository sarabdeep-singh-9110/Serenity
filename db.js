const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function initDB() {
  const dbPath = './database.sqlite';
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  return db;
}

module.exports = { initDB };
