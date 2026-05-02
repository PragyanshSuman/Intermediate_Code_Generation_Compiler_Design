'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const { testConnection } = require('./db');
const compileRouter      = require('./routes/compile');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', compileRouter);

// ─── Static Frontend ──────────────────────────────────────────────────────────
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀  ICG Studio running at  http://localhost:${PORT}`);
    console.log(`    Frontend:              http://localhost:${PORT}/`);
    console.log(`    API base:              http://localhost:${PORT}/api`);
    console.log(`\n    If first run, initialize the DB at:`);
    console.log(`    POST http://localhost:${PORT}/api/init-db\n`);
  });
})();
