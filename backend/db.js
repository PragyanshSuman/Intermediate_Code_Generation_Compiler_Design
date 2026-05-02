'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

/**
 * MySQL connection pool — shared across the entire app.
 */
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'compiler_icg',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

/**
 * Test connectivity at startup.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected — database:', process.env.DB_NAME || 'compiler_icg');
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    console.error('    Make sure MySQL is running and .env credentials are correct.');
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
