const pg = require('pg');

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: { rejectUnauthorized: false },
});

// 👇 Set the schema AFTER connecting
db.connect((err) => {
  if (err) throw err;
  db.query('SET search_path TO eclasslink, public;', (err) => {
    if (err) throw err;
    console.log('Search path set to eclasslink');
  });
});

module.exports = db;
