const env = require('dotenv');
env.config({ path: './config.env' });

const initializeDatabase = require('./models/initializeDatabase');

const app = require('./app');

async function startServer() {
  try {
    // Always initialize DB in all environments
    await initializeDatabase();
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ Failed to initialize DB:', err);
    process.exit(1);
  }

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

startServer();
