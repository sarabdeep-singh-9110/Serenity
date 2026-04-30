const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, rows) => {
  console.log(rows);
});
