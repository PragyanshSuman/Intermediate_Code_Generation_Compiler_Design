'use strict';
/* ============================================================
   ICG Studio — Frontend Application Logic
   ============================================================ */

const API = 'http://localhost:3001/api';
let currentSessionId = null;
let currentData = null;
let stepTimer = null;
let currentStep = 0;
let totalSteps = 0;

// ─── Tab Switching ────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
}

// ─── Use Example ─────────────────────────────────────────────
function useExample(el) {
  const input = document.getElementById('expressionInput');
  input.textContent = el.textContent.trim();
  input.focus();
}

// ─── Compile ─────────────────────────────────────────────────

// Enter key
document.getElementById('expressionInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    compileExpression();
  }
});

async function compileExpression() {
  const exprBox = document.getElementById('expressionInput');
  const expr = exprBox.textContent.trim();
  if (!expr) { showToast('Please enter an expression', 'error'); return; }

  const btn = document.getElementById('compileBtn');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinner"></span> Compiling…';

  try {
    const mode = document.getElementById('modeSelect').value;
    const endpoint = mode === 'snippet' ? '/compile-snippet' : '/compile';

    const res  = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: expr }),
    });
    const data = await res.json();

    if (!data.success) { 
      showToast(data.error, 'error'); 
      return; 
    }

    currentSessionId = data.sessionId;
    currentData = data;
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

// ─── Render Results ───────────────────────────────────────────
function renderResults(data) {
  currentData = data;
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
  if (data.ast) renderAST(data.ast);

  document.getElementById('stepControls').style.display = data.tac.length > 0 ? 'flex' : 'none';
  showAllSteps();
}

// ─── TAC ──────────────────────────────────────────────────────
function renderTAC(tac) {
  const out = document.getElementById('tacOutput');
  const tableWrap = document.getElementById('tacTableWrap');

  // Monospace code block
  out.innerHTML = `<div class="tac-mono">${
    tac.map((instr, i) => {
      const delay = i * 60;
      const tacStr = instr.tacString || '';

      // Control flow lines — render as full-width monospace lines
      const controlOps = ['LABEL', 'GOTO', 'ifFalse', 'param', 'return', 'call'];
      if (controlOps.includes(instr.operator)) {
        const isLabel  = instr.operator === 'LABEL';
        const isJump   = instr.operator === 'GOTO' || instr.operator === 'ifFalse';
        const color    = isLabel ? '#f59e0b' : isJump ? '#a78bfa' : '#67e8f9';
        return `<div class="tac-line" style="animation-delay:${delay}ms">
          <span class="ln">${String(i).padStart(2,'0')}:</span><span style="color:${color}; font-weight:600;">${escHtml(tacStr)}</span>
        </div>`;
      }

      // Regular assignment instructions
      const lhs = `<span class="res">${escHtml(String(instr.result ?? ''))}</span>`;
      const eql = `<span class="eql">=</span>`;
      let rhs = '';
      if (instr.op2 && instr.op2 !== '-') {
        rhs = `<span class="operand">${escHtml(String(instr.op1 ?? ''))}</span><span class="opr">${escHtml(instr.operator)}</span><span class="operand">${escHtml(String(instr.op2))}</span>`;
      } else if (instr.operator === '=') {
        rhs = `<span class="operand">${escHtml(String(instr.op1 ?? ''))}</span>`;
      } else {
        rhs = `<span class="opr">${escHtml(instr.operator)}</span> <span class="operand">${escHtml(String(instr.op1 ?? ''))}</span>`;
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

// ─── Export ───────────────────────────────────────────────────
function getActiveTable() {
  const activeTabBtn = document.querySelector('.tab-btn.active');
  const tab = activeTabBtn ? activeTabBtn.dataset.tab : 'tac';
  let title = 'Table';
  let headers = [];
  let rows = [];

  if (!currentData) return null;

  if (tab === 'tac') {
    title = 'Three Address Code';
    headers = ['Step', 'Result', 'Operand 1', 'Operator', 'Operand 2'];
    rows = currentData.tac.map(r => [r.step, r.result, r.op1, r.operator, r.op2]);
  } else if (tab === 'quad') {
    title = 'Quadruples';
    headers = ['Step', 'Operator', 'Arg 1', 'Arg 2', 'Result'];
    rows = currentData.quadruples.map(r => [r.step, r.operator, r.arg1, r.arg2, r.result]);
  } else if (tab === 'tri') {
    title = 'Triples';
    headers = ['Step', 'Operator', 'Arg 1', 'Arg 2'];
    rows = currentData.triples.map(r => [r.step, r.operator, r.arg1, r.arg2]);
  } else if (tab === 'ind') {
    title = 'Indirect Triples';
    headers = ['Pointer Index', 'Triple Index'];
    rows = currentData.indirectTriples.pointerArray.map(r => [r.pointer_index, r.triple_index]);
  } else if (tab === 'ast') {
    showToast('Cannot export AST to CSV/PDF', 'error');
    return null;
  }
  return { title, headers, rows };
}

function exportCSV() {
  const tableData = getActiveTable();
  if (!tableData) return;
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += tableData.headers.join(",") + "\r\n";
  tableData.rows.forEach(rowArray => {
    const row = rowArray.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",");
    csvContent += row + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${tableData.title.replace(/\\s+/g, '_')}_${currentSessionId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportPDF() {
  const tableData = getActiveTable();
  if (!tableData) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(tableData.title, 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Expression: ${currentData.expression}`, 14, 30);
  
  let y = 45;
  
  // Headers
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const colWidth = 180 / tableData.headers.length;
  tableData.headers.forEach((h, i) => {
    doc.text(h, 14 + i * colWidth, y);
  });
  
  y += 8;
  doc.setFont(undefined, 'normal');
  tableData.rows.forEach(row => {
    row.forEach((cell, i) => {
      doc.text(String(cell), 14 + i * colWidth, y);
    });
    y += 8;
  });
  
  doc.save(`${tableData.title.replace(/\\s+/g, '_')}_${currentSessionId}.pdf`);
}

// ─── Step-Through Animation ───────────────────────────────────
function stopStepThrough() {
  if (stepTimer) clearInterval(stepTimer);
  stepTimer = null;
}

function startStepThrough() {
  stopStepThrough();
  const lines = document.querySelectorAll('.tac-line');
  const rows = document.querySelectorAll('#tacTableWrap tbody tr');
  totalSteps = lines.length;
  currentStep = 0;
  
  lines.forEach(l => l.style.display = 'none');
  rows.forEach(r => r.style.display = 'none');
  
  document.getElementById('btnStepThrough').style.display = 'none';
  document.getElementById('btnPrevStep').style.display = 'block';
  document.getElementById('btnNextStep').style.display = 'block';
  document.getElementById('btnResetSteps').style.display = 'block';
  document.getElementById('btnShowAllSteps').style.display = 'block';
  
  updateStepCounter();
  
  stepTimer = setInterval(() => {
    if (currentStep < totalSteps) {
      showTacStep(currentStep);
      currentStep++;
      updateStepCounter();
    } else {
      stopStepThrough();
    }
  }, 1000);
}

function showTacStep(index) {
  const lines = document.querySelectorAll('.tac-line');
  const rows = document.querySelectorAll('#tacTableWrap tbody tr');
  if (lines[index]) {
    lines[index].style.display = '';
    lines[index].style.animation = 'none';
    lines[index].offsetHeight; 
    lines[index].style.animation = 'rowIn .25s ease forwards';
  }
  if (rows[index]) {
    rows[index].style.display = '';
    rows[index].style.animation = 'none';
    rows[index].offsetHeight;
    rows[index].style.animation = 'rowIn .25s ease forwards';
  }
}

function updateStepCounter() {
  document.getElementById('stepCounter').textContent = `Step ${currentStep} / ${totalSteps}`;
}

function nextStep() {
  stopStepThrough();
  if (currentStep < totalSteps) {
    showTacStep(currentStep);
    currentStep++;
    updateStepCounter();
  }
}

function prevStep() {
  stopStepThrough();
  if (currentStep > 0) {
    currentStep--;
    const lines = document.querySelectorAll('.tac-line');
    const rows = document.querySelectorAll('#tacTableWrap tbody tr');
    if (lines[currentStep]) lines[currentStep].style.display = 'none';
    if (rows[currentStep]) rows[currentStep].style.display = 'none';
    updateStepCounter();
  }
}

function resetSteps() {
  stopStepThrough();
  const lines = document.querySelectorAll('.tac-line');
  const rows = document.querySelectorAll('#tacTableWrap tbody tr');
  lines.forEach(l => l.style.display = 'none');
  rows.forEach(r => r.style.display = 'none');
  currentStep = 0;
  updateStepCounter();
}

function showAllSteps() {
  stopStepThrough();
  const lines = document.querySelectorAll('.tac-line');
  const rows = document.querySelectorAll('#tacTableWrap tbody tr');
  lines.forEach(l => { l.style.display = ''; l.style.animation = 'none'; l.style.opacity = '1'; });
  rows.forEach(r => { r.style.display = ''; r.style.animation = 'none'; r.style.opacity = '1'; });
  totalSteps = lines.length;
  currentStep = totalSteps;
  updateStepCounter();
  
  document.getElementById('btnStepThrough').style.display = 'block';
  document.getElementById('btnPrevStep').style.display = 'none';
  document.getElementById('btnNextStep').style.display = 'none';
  document.getElementById('btnResetSteps').style.display = 'none';
  document.getElementById('btnShowAllSteps').style.display = 'none';
}

// ─── AST Rendering ────────────────────────────────────────────
function renderAST(astRoot) {
  const wrap = document.getElementById('astSvgWrap');
  if (!astRoot) {
    wrap.innerHTML = '<div class="empty-state"><div class="icon">🌳</div><p>No AST generated</p></div>';
    return;
  }

  const nodeWidth = 100;
  const nodeHeight = 40;
  const verticalSpacing = 60;
  const horizontalSpacing = 20;

  function buildTree(node) {
    if (!node) return null;
    const treeNode = { node, width: 0, x: 0, y: 0, children: [] };
    
    if (node.type === 'Assignment') {
      const left = { node: { type: 'Identifier', value: node.lhs }, width: nodeWidth, x: 0, y: 0, children: [] };
      const right = buildTree(node.rhs);
      treeNode.children = [left, right].filter(Boolean);
    } else if (node.type === 'BinaryOp') {
      const left = buildTree(node.left);
      const right = buildTree(node.right);
      treeNode.children = [left, right].filter(Boolean);
    } else if (node.type === 'UnaryOp') {
      const child = buildTree(node.operand);
      if (child) treeNode.children = [child];
    } else if (node.type === 'Parentheses') {
      const child = buildTree(node.inner);
      if (child) treeNode.children = [child];
      treeNode.node.value = '( )';
    } else if (node.type === 'Program' || node.type === 'Block') {
      treeNode.children = node.body.map(buildTree).filter(Boolean);
    } else if (node.type === 'Function') {
      treeNode.children = [buildTree(node.body)].filter(Boolean);
      treeNode.node.value = node.name;
    } else if (node.type === 'ExprStmt') {
      treeNode.children = [buildTree(node.expr)].filter(Boolean);
    } else if (node.type === 'VarDecl') {
      treeNode.children = node.decls.map(d => buildTree(d.init)).filter(Boolean);
      treeNode.node.value = node.decls.map(d => d.id).join(',');
    } else if (node.type === 'PostfixOp') {
      treeNode.children = [buildTree(node.operand)].filter(Boolean);
      treeNode.node.value = node.op;
    } else if (node.type === 'FunctionCall') {
      treeNode.children = node.args.map(buildTree).filter(Boolean);
      treeNode.node.value = node.name;
    } else if (node.type === 'IfElse') {
      treeNode.children = [buildTree(node.cond), buildTree(node.trueBranch), buildTree(node.falseBranch)].filter(Boolean);
    } else if (node.type === 'ForLoop') {
      treeNode.children = [buildTree(node.init), buildTree(node.cond), buildTree(node.inc), buildTree(node.body)].filter(Boolean);
    } else if (node.type === 'Return') {
      treeNode.children = [buildTree(node.expr)].filter(Boolean);
    }
    
    if (treeNode.children.length === 0) {
      treeNode.width = nodeWidth;
    } else {
      treeNode.width = treeNode.children.reduce((sum, c) => sum + c.width, 0) + (treeNode.children.length - 1) * horizontalSpacing;
    }
    return treeNode;
  }

  const tree = buildTree(astRoot);
  
  function positionTree(treeNode, x, y) {
    treeNode.x = x + treeNode.width / 2;
    treeNode.y = y;
    let currentX = x;
    treeNode.children.forEach(c => {
      positionTree(c, currentX, y + nodeHeight + verticalSpacing);
      currentX += c.width + horizontalSpacing;
    });
  }
  
  positionTree(tree, 0, nodeHeight / 2);

  const totalWidth = Math.max(tree.width, 400);
  const getDepth = n => n.children.length === 0 ? 1 : 1 + Math.max(...n.children.map(getDepth));
  const totalHeight = getDepth(tree) * (nodeHeight + verticalSpacing);
  
  let svg = `<svg width="${totalWidth + 40}" height="${totalHeight + 40}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<g transform="translate(20, 20)">`;
  
  function drawEdges(n) {
    n.children.forEach(c => {
      svg += `<path class="ast-edge" d="M ${n.x} ${n.y + nodeHeight/2} C ${n.x} ${n.y + nodeHeight/2 + verticalSpacing/2}, ${c.x} ${c.y - nodeHeight/2 - verticalSpacing/2}, ${c.x} ${c.y - nodeHeight/2}" />`;
      drawEdges(c);
    });
  }
  
  function drawNodes(n) {
    const label = n.node.op || n.node.value || n.node.type;
    const typeLabel = n.node.type;
    svg += `
      <g class="ast-node" transform="translate(${n.x - nodeWidth/2}, ${n.y - nodeHeight/2})">
        <rect width="${nodeWidth}" height="${nodeHeight}" />
        <text x="${nodeWidth/2}" y="${nodeHeight/2 - 6}" style="font-size:10px; fill:#94a3b8;">${typeLabel}</text>
        <text x="${nodeWidth/2}" y="${nodeHeight/2 + 8}">${escHtml(String(label))}</text>
      </g>
    `;
    n.children.forEach(drawNodes);
  }
  
  drawEdges(tree);
  drawNodes(tree);
  
  svg += `</g></svg>`;
  wrap.innerHTML = svg;
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
    currentData = data;
    document.getElementById('expressionInput').textContent = data.expression;
    // AST is not returned from /session/:id right now, but compile route returns it. 
    // Since AST isn't saved to DB, it might be undefined here. Let's hide it if so.
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

// ─── Mode Switcher ────────────────────────────────────────────
document.getElementById('modeSelect').addEventListener('change', function() {
  const isSnippet = this.value === 'snippet';
  document.getElementById('inputModeLabel').textContent    = isSnippet ? 'C Snippet' : 'Expression';
  document.getElementById('inputModeHint').textContent     = isSnippet
    ? 'supports: for, if/else, while, printf, return'
    : 'supports: + − * / % ^ || && ! == != < > <= >=';
  document.getElementById('expressionInput').setAttribute(
    'placeholder',
    isSnippet
      ? 'e.g.  #include <stdio.h>\nint main() { ... }'
      : 'e.g.  a + b * c - d / e'
  );
});
