const env = require('dotenv');
env.config({ path: './config.env' });

const app = require('./app');

const PORT = process.env.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
