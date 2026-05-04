'use strict';

const express = require('express');
const router  = express.Router();
const { pool }        = require('../db');
const { parse }       = require('../parser');
const { generateIR }  = require('../irGenerator');
const snippetParser   = require('../snippetParser');
const snippetIrGenerator = require('../snippetIrGenerator');

// ─── POST /api/compile ────────────────────────────────────────────────────────
/**
 * Body: { expression: string }
 * Parses the expression, generates all 4 IRs, persists to DB, returns results.
 */
router.post('/compile', async (req, res) => {
  const { expression } = req.body;

  if (!expression || !expression.trim()) {
    return res.status(400).json({ success: false, error: 'Expression is required' });
  }

  let ast, ir;
  try {
    ast = parse(expression.trim());
    ir  = generateIR(ast);
  } catch (err) {
    return res.status(422).json({ success: false, error: `Parse error: ${err.message}` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert session
    const [sessResult] = await conn.execute(
      'INSERT INTO sessions (expression) VALUES (?)',
      [expression.trim()]
    );
    const sessionId = sessResult.insertId;

    // 2. Insert Three Address Code
    for (const instr of ir.tac) {
      await conn.execute(
        `INSERT INTO three_address_code
           (session_id, step, result, op1, operator, op2, tac_string)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          instr.step,
          instr.result,
          instr.op1,
          instr.operator,
          instr.op2 ?? null,
          ir.tacStrings[instr.step],
        ]
      );
    }

    // 3. Insert Quadruples
    for (const q of ir.quadruples) {
      await conn.execute(
        `INSERT INTO quadruples (session_id, step, operator, arg1, arg2, result)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, q.step, q.operator, q.arg1, q.arg2, q.result]
      );
    }

    // 4. Insert Triples
    for (const t of ir.triples) {
      await conn.execute(
        `INSERT INTO triples (session_id, step, operator, arg1, arg2)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, t.step, t.operator, t.arg1, t.arg2]
      );
    }

    // 5. Insert Indirect Triples (pointer array)
    for (const p of ir.indirectTriples.pointerArray) {
      await conn.execute(
        `INSERT INTO indirect_triples (session_id, pointer_index, triple_index)
         VALUES (?, ?, ?)`,
        [sessionId, p.pointer_index, p.triple_index]
      );
    }

    await conn.commit();

    return res.json({
      success: true,
      sessionId,
      expression: expression.trim(),
      ast,
      tac:            ir.tac.map((instr, i) => ({
        step:     instr.step,
        result:   instr.result,
        op1:      instr.op1,
        operator: instr.operator,
        op2:      instr.op2 ?? '-',
        tacString: ir.tacStrings[i],
      })),
      quadruples: ir.quadruples,
      triples:    ir.triples,
      indirectTriples: {
        pointerArray: ir.indirectTriples.pointerArray,
        triples:      ir.indirectTriples.triples,
      },
    });
  } catch (dbErr) {
    await conn.rollback();
    console.error('DB error:', dbErr);
    return res.status(500).json({ success: false, error: 'Database error: ' + dbErr.message });
  } finally {
    conn.release();
  }
});

// ─── POST /api/compile-snippet ───────────────────────────────────────────────
router.post('/compile-snippet', async (req, res) => {
  const { expression } = req.body;

  if (!expression || !expression.trim()) {
    return res.status(400).json({ success: false, error: 'Expression is required' });
  }

  let ast, ir;
  try {
    ast = snippetParser.parse(expression.trim());
    ir  = snippetIrGenerator.generateIR(ast);
  } catch (err) {
    return res.status(422).json({ success: false, error: `Parse error: ${err.message}` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sessResult] = await conn.execute(
      'INSERT INTO sessions (expression) VALUES (?)',
      [expression.trim()]
    );
    const sessionId = sessResult.insertId;

    for (const instr of ir.tac) {
      await conn.execute(
        `INSERT INTO three_address_code
           (session_id, step, result, op1, operator, op2, tac_string)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId, instr.step, instr.result ?? '-', instr.op1 ?? '-', instr.operator, instr.op2 ?? null, ir.tacStrings[instr.step],
        ]
      );
    }

    for (const q of ir.quadruples) {
      await conn.execute(
        `INSERT INTO quadruples (session_id, step, operator, arg1, arg2, result)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, q.step, q.operator, q.arg1, q.arg2, q.result]
      );
    }

    for (const t of ir.triples) {
      await conn.execute(
        `INSERT INTO triples (session_id, step, operator, arg1, arg2)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, t.step, t.operator, t.arg1, t.arg2]
      );
    }

    for (const p of ir.indirectTriples.pointerArray) {
      await conn.execute(
        `INSERT INTO indirect_triples (session_id, pointer_index, triple_index)
         VALUES (?, ?, ?)`,
        [sessionId, p.pointer_index, p.triple_index]
      );
    }

    await conn.commit();

    return res.json({
      success: true,
      sessionId,
      expression: expression.trim(),
      ast,
      tac: ir.tac.map((instr, i) => ({
        step: instr.step,
        result: instr.result ?? '-',
        op1: instr.op1 ?? '-',
        operator: instr.operator,
        op2: instr.op2 ?? '-',
        tacString: ir.tacStrings[i],
      })),
      quadruples: ir.quadruples,
      triples: ir.triples,
      indirectTriples: ir.indirectTriples,
    });
  } catch (dbErr) {
    await conn.rollback();
    console.error('DB error:', dbErr);
    return res.status(500).json({ success: false, error: 'Database error: ' + dbErr.message });
  } finally {
    conn.release();
  }
});

// ─── GET /api/history ────────────────────────────────────────────────────────
/**
 * Returns the last 15 compiled sessions (expression + session id + timestamp).
 */
router.get('/history', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.expression, s.created_at,
              COUNT(t.id) AS instruction_count
         FROM sessions s
         LEFT JOIN three_address_code t ON t.session_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 15`
    );
    return res.json({ success: true, history: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/session/:id ─────────────────────────────────────────────────────
/**
 * Returns the full IR data for a specific session.
 */
router.get('/session/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid session id' });

  try {
    const [[session]] = await pool.execute('SELECT * FROM sessions WHERE id = ?', [id]);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const [tac]     = await pool.execute('SELECT * FROM three_address_code WHERE session_id = ? ORDER BY step', [id]);
    const [quads]   = await pool.execute('SELECT * FROM quadruples          WHERE session_id = ? ORDER BY step', [id]);
    const [triples] = await pool.execute('SELECT * FROM triples             WHERE session_id = ? ORDER BY step', [id]);
    const [indirect]= await pool.execute('SELECT * FROM indirect_triples    WHERE session_id = ? ORDER BY pointer_index', [id]);

    return res.json({
      success: true,
      sessionId: id,
      expression: session.expression,
      createdAt:  session.created_at,
      tac:     tac.map(r => ({
        step: r.step, result: r.result, op1: r.op1,
        operator: r.operator, op2: r.op2 ?? '-', tacString: r.tac_string,
      })),
      quadruples: quads.map(r => ({
        step: r.step, operator: r.operator, arg1: r.arg1, arg2: r.arg2, result: r.result,
      })),
      triples: triples.map(r => ({
        step: r.step, operator: r.operator, arg1: r.arg1, arg2: r.arg2,
      })),
      indirectTriples: {
        pointerArray: indirect.map(r => ({
          pointer_index: r.pointer_index, triple_index: r.triple_index,
        })),
        triples: triples.map(r => ({
          step: r.step, operator: r.operator, arg1: r.arg1, arg2: r.arg2,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/session/:id ─────────────────────────────────────────────────
/**
 * Deletes a session and all its associated IR data (via CASCADE).
 */
router.delete('/session/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid session id' });
  try {
    await pool.execute('DELETE FROM sessions WHERE id = ?', [id]);
    return res.json({ success: true, message: `Session ${id} deleted` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/init-db ────────────────────────────────────────────────────────
/**
 * Convenience endpoint: reads schema.sql and executes it.
 * Call once after first startup.
 */
router.post('/init-db', async (req, res) => {
  const fs   = require('fs');
  const path = require('path');
  const sqlPath = path.join(__dirname, '..', 'schema.sql');

  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    // Split on statement delimiters (semicolons) and run each
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    const conn = await pool.getConnection();
    try {
      for (const stmt of statements) {
        await conn.execute(stmt);
      }
    } finally {
      conn.release();
    }
    return res.json({ success: true, message: 'Database initialized successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
