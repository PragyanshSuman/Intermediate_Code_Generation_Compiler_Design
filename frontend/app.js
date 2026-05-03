'use strict';
/* ============================================================
   ICG Studio — Frontend Application Logic
   ============================================================ */

const API = 'http://localhost:3001/api';
let currentSessionId = null;

// ─── Tab Switching ────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
}

// ─── Use Example ─────────────────────────────────────────────
function useExample(el) {
  document.getElementById('expressionInput').value = el.textContent.trim();
  document.getElementById('expressionInput').focus();
}

// ─── Compile ─────────────────────────────────────────────────
async function compileExpression() {
  const expr = document.getElementById('expressionInput').value.trim();
  if (!expr) { showToast('Please enter an expression', 'error'); return; }

  const btn = document.getElementById('compileBtn');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinner"></span> Compiling…';

  try {
    const res  = await fetch(`${API}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: expr }),
    });
    const data = await res.json();

    if (!data.success) { showToast(data.error, 'error'); return; }

    currentSessionId = data.sessionId;
    renderResults(data);
    showToast(`✅ Compiled! Session #${data.sessionId} saved to DB`, 'success');
    loadHistory();
  } catch (e) {
    showToast('Server error — is the backend running?', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = 'Compile ▶';
  }
}

// Enter key
document.getElementById('expressionInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') compileExpression();
});

// ─── Render Results ───────────────────────────────────────────
function renderResults(data) {
  // Stats
  document.getElementById('statsBar').style.display = 'flex';
  document.getElementById('statTac').textContent  = data.tac.length;
  document.getElementById('statQuad').textContent = data.quadruples.length;
  document.getElementById('statTri').textContent  = data.triples.length;
  document.getElementById('statInd').textContent  = data.indirectTriples.pointerArray.length;

  renderTAC(data.tac);
  renderQuadruples(data.quadruples);
  renderTriples(data.triples);
  renderIndirectTriples(data.indirectTriples);
}

// ─── TAC ──────────────────────────────────────────────────────
function renderTAC(tac) {
  const out = document.getElementById('tacOutput');
  const tableWrap = document.getElementById('tacTableWrap');

  // Monospace code block
  out.innerHTML = `<div class="tac-mono">${
    tac.map((instr, i) => {
      const delay = i * 60;
      const lhs = `<span class="res">${instr.result}</span>`;
      const eql = `<span class="eql">=</span>`;
      let rhs = '';
      if (instr.op2 && instr.op2 !== '-') {
        rhs = `<span class="operand">${instr.op1}</span><span class="opr">${instr.operator}</span><span class="operand">${instr.op2}</span>`;
      } else if (instr.operator === '=') {
        rhs = `<span class="operand">${instr.op1}</span>`;
      } else {
        rhs = `<span class="opr">${instr.operator}</span> <span class="operand">${instr.op1}</span>`;
      }
      return `<div class="tac-line" style="animation-delay:${delay}ms">
        <span class="ln">${String(i).padStart(2,'0')}:</span>${lhs} ${eql} ${rhs}
      </div>`;
    }).join('')
  }</div>`;

  // Table
  tableWrap.style.display = 'block';
  tableWrap.innerHTML = buildTable(
    ['#', 'Result', 'Operand 1', 'Operator', 'Operand 2'],
    tac.map((r, i) => [
      `<span class="step-badge">${r.step}</span>`,
      `<span class="result-cell">${r.result}</span>`,
      r.op1,
      `<span class="op-chip">${r.operator}</span>`,
      r.op2 || '—',
    ]),
    i => i * 60
  );
}

// ─── Quadruples ───────────────────────────────────────────────
function renderQuadruples(quads) {
  document.getElementById('quadTableWrap').innerHTML = buildTable(
    ['#', 'Operator', 'Arg 1', 'Arg 2', 'Result'],
    quads.map(r => [
      `<span class="step-badge cyan">${r.step}</span>`,
      `<span class="op-chip">${r.operator}</span>`,
      r.arg1,
      r.arg2 === '-' ? '—' : r.arg2,
      `<span class="result-cell">${r.result}</span>`,
    ]),
    i => i * 60
  );
}

// ─── Triples ──────────────────────────────────────────────────
function renderTriples(triples) {
  document.getElementById('triTableWrap').innerHTML = buildTable(
    ['#', 'Operator', 'Arg 1', 'Arg 2'],
    triples.map(r => [
      `<span class="step-badge green">${r.step}</span>`,
      `<span class="op-chip">${r.operator}</span>`,
      isRef(r.arg1) ? `<span class="ref-cell">${r.arg1}</span>` : r.arg1,
      r.arg2 === '-' ? '—' : (isRef(r.arg2) ? `<span class="ref-cell">${r.arg2}</span>` : r.arg2),
    ]),
    i => i * 60
  );
}

// Detects temp variable names like t1, t2, t3 …
function isRef(v) { return v && /^t\d+$/.test(v); }

// ─── Indirect Triples ─────────────────────────────────────────
function renderIndirectTriples(ind) {
  // Pointer array table
  document.getElementById('ptrTableWrap').innerHTML = buildTable(
    ['Ptr Idx', '→ Triple'],
    ind.pointerArray.map(r => [
      `<span class="step-badge orange">${r.pointer_index}</span>`,
      `<span class="pointer-cell">→ (${r.triple_index})</span>`,
    ]),
    i => i * 60
  );

  // Triples table (same triples, but shown again)
  document.getElementById('indTriTableWrap').innerHTML = buildTable(
    ['#', 'Op', 'Arg 1', 'Arg 2'],
    ind.triples.map(r => [
      `<span class="step-badge green">${r.step}</span>`,
      `<span class="op-chip">${r.operator}</span>`,
      isRef(r.arg1) ? `<span class="ref-cell">${r.arg1}</span>` : r.arg1,
      r.arg2 === '-' ? '—' : (isRef(r.arg2) ? `<span class="ref-cell">${r.arg2}</span>` : r.arg2),
    ]),
    i => i * 60
  );
}

// ─── Table Builder ────────────────────────────────────────────
function buildTable(headers, rows, delayFn) {
  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${
    rows.map((cells, i) =>
      `<tr style="animation-delay:${delayFn(i)}ms">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
    ).join('')
  }</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

// ─── History ──────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res  = await fetch(`${API}/history`);
    const data = await res.json();
    if (!data.success) return;

    const list = document.getElementById('historyList');
    if (!data.history.length) {
      list.innerHTML = '<div class="no-history">No compilations yet</div>';
      return;
    }

    list.innerHTML = data.history.map(h => `
      <div class="history-item ${h.id === currentSessionId ? 'active':''}" id="hi-${h.id}" onclick="loadSession(${h.id})">
        <div class="hi-expr">${escHtml(h.expression)}</div>
        <div class="hi-meta">
          <span class="count">${h.instruction_count} steps</span>
          <span>${formatDate(h.created_at)}</span>
          <button class="hi-del" onclick="deleteSession(event, ${h.id})" title="Delete">✕</button>
        </div>
      </div>
    `).join('');

    document.getElementById('dbTableCount').textContent = '5 tables';
  } catch(e) { /* silently fail */ }
}

async function loadSession(id) {
  try {
    const res  = await fetch(`${API}/session/${id}`);
    const data = await res.json();
    if (!data.success) { showToast(data.error, 'error'); return; }

    currentSessionId = id;
    document.getElementById('expressionInput').value = data.expression;
    renderResults(data);
    document.querySelectorAll('.history-item').forEach(el => el.classList.toggle('active', el.id === `hi-${id}`));
    showToast(`Loaded session #${id}`, 'success');
  } catch(e) {
    showToast('Failed to load session', 'error');
  }
}

async function deleteSession(e, id) {
  e.stopPropagation();
  try {
    await fetch(`${API}/session/${id}`, { method: 'DELETE' });
    showToast(`Session #${id} deleted`, 'success');
    if (currentSessionId === id) currentSessionId = null;
    loadHistory();
  } catch(e) {
    showToast('Delete failed', 'error');
  }
}

// ─── Init DB ──────────────────────────────────────────────────
async function initDB() {
  try {
    const res  = await fetch(`${API}/init-db`, { method: 'POST' });
    const data = await res.json();
    if (data.success) { showToast('✅ Database initialized!', 'success'); loadHistory(); }
    else showToast(data.error, 'error');
  } catch(e) {
    showToast('Failed — is the server running?', 'error');
  }
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span class="toast-msg">${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 310);
  }, 3200);
}

// ─── Helpers ──────────────────────────────────────────────────
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}

// ─── Boot ─────────────────────────────────────────────────────
loadHistory();
