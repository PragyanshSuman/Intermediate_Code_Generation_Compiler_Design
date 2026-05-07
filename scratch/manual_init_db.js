const { pool } = require('../backend/db');
const fs = require('fs');
const path = require('path');

async function init() {
  const sqlPath = path.join(__dirname, '..', 'backend', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  
  const conn = await pool.getConnection();
  try {
    console.log('Starting DB initialization...');
    for (let stmt of statements) {
      console.log('Executing:', stmt.substring(0, 50) + '...');
      await conn.query(stmt);
    }
    console.log('Database initialized successfully!');
  } catch (e) {
    console.error('Initialization failed:', e.message);
  } finally {
    conn.release();
    process.exit();
  }
}

init();
