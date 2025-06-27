const env = require('dotenv');
env.config({ path: './config.env' });

const app = require('./app');
const PORT = 3000;

// connect to the database

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
