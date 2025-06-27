const express = require('express');
const db = require('./config/db');

const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
  const users = await db.query(`SELECT * FROM users`);
  res.status(200).json({
    status: 'success',
    result: users.rows.length,
    data: users.rows,
  });
});

module.exports = app;
