require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established.');
    connection.release();

   app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}.`);
});

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();