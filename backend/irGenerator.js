'use strict';

/**
 * ============================================================
 *  Intermediate Code Generator
 *
 *  Input  : AST produced by parser.js
 *  Output : {
 *    tac            : Three Address Code instructions (array)
 *    quadruples     : Quadruples table (array)
 *    triples        : Triples table (array)
 *    indirectTriples: Indirect Triples (pointer array + triples)
 *    tacStrings     : Human-readable TAC strings
 *  }
 * ============================================================
 */

/**
 * Walk the AST in post-order and emit TAC instructions.
 * Returns the flat instruction array and the "result" of the root node.
 *
 * Instruction shape:
 *   { step, result, op1, operator, op2 }
 *   - For binary ops:  result = op1 operator op2
 *   - For unary ops:   result = operator op1      (op2 = null)
 */
function buildTAC(ast) {
  const instructions = [];
  let   tempCount    = 0;

  function newTemp() { return `t${++tempCount}`; }

  function emit(result, op1, operator, op2 = null) {
    const step = instructions.length;
    instructions.push({ step, result, op1, operator, op2 });
    return result;
  }

  function getPriority(node) {
    if (!node) return 0;
    if (node._priority !== undefined) return node._priority;
    
    let maxPri = 0;
    if (node.type === 'Parentheses') {
      maxPri = getPriority(node.inner) + 1000;
    } else if (node.type === 'UnaryOp') {
      maxPri = Math.max(50, getPriority(node.operand));
    } else if (node.type === 'BinaryOp') {
      let opPri = 0;
      if (['^'].includes(node.op)) opPri = 40;
      else if (['*', '/', '%'].includes(node.op)) opPri = 30;
      else if (['+', '-'].includes(node.op)) opPri = 20;
      else if (['<', '>', '<=', '>=', '==', '!='].includes(node.op)) opPri = 10;
      else opPri = 5;
      
      const leftPri = getPriority(node.left);
      const rightPri = getPriority(node.right);
      maxPri = Math.max(opPri, leftPri, rightPri);
    } else if (node.type === 'Assignment') {
      maxPri = getPriority(node.rhs);
    }
    
    node._priority = maxPri;
    return maxPri;
  }

  function visit(node) {
    if (!node) throw new Error('Null AST node');

    // Leaf nodes — no instruction needed, just return the value
    if (node.type === 'Number' || node.type === 'Identifier') {
      return node.value;
    }

    // Assignment  →  visit RHS, then emit  LHS = tN
    if (node.type === 'Assignment') {
      const rhs = visit(node.rhs);
      // Emit a final copy instruction:  X = tN
      return emit(node.lhs, rhs, '=', null);
    }

    // Unary operation  →  t_n = op  operand
    if (node.type === 'UnaryOp') {
      const operand = visit(node.operand);
      const opSymbol = node.op === '-' ? 'UMINUS' : node.op === '!' ? 'NOT' : node.op;
      const tmp = newTemp();
      return emit(tmp, operand, opSymbol, null);
    }

    // Parentheses wrapper
    if (node.type === 'Parentheses') {
      return visit(node.inner);
    }

    // Binary operation  →  t_n = left op right
    if (node.type === 'BinaryOp') {
      const leftPri = getPriority(node.left);
      const rightPri = getPriority(node.right);
      
      let left, right;
      // Evaluate higher priority branch first
      if (leftPri >= rightPri) {
        left  = visit(node.left);
        right = visit(node.right);
      } else {
        right = visit(node.right);
        left  = visit(node.left);
      }
      
      const tmp   = newTemp();
      return emit(tmp, left, node.op, right);
    }

    throw new Error(`Unknown AST node type: ${node.type}`);
  }

  const finalResult = visit(ast);

  // Edge-case: a single literal / identifier (no operations)
  if (instructions.length === 0) {
    emit('t1', finalResult, '=', null);
  }

  return { instructions, finalResult };
}

/**
 * Build TAC human-readable strings from instruction list.
 */
function buildTACStrings(instructions) {
  return instructions.map(instr => {
    if (instr.op2 === null || instr.op2 === undefined) {
      if (instr.operator === '=') {
        return `${instr.result} = ${instr.op1}`;
      }
      return `${instr.result} = ${instr.operator} ${instr.op1}`;
    }
    return `${instr.result} = ${instr.op1} ${instr.operator} ${instr.op2}`;
  });
}

/**
 * Build Quadruples from instruction list.
 *   Format: (operator, arg1, arg2, result)
 */
function buildQuadruples(instructions) {
  return instructions.map(instr => ({
    step:     instr.step,
    operator: instr.operator,
    arg1:     instr.op1    !== null && instr.op1    !== undefined ? instr.op1    : '-',
    arg2:     instr.op2    !== null && instr.op2    !== undefined ? instr.op2    : '-',
    result:   instr.result,
  }));
}

/**
 * Build Triples from instruction list.
 *   Format: (operator, arg1, arg2)
 *   Temp-variable references use the same names as TAC (t1, t2 …).
 *   No explicit result field — the step number identifies the result.
 */
function buildTriples(instructions) {
  // Collect all temp variable names produced by instructions
  const tempNames = new Set(instructions.map(i => i.result));

  function resolveArg(arg) {
    if (arg === null || arg === undefined) return '-';
    // If the arg is a temp variable (exists as a result in TAC), keep its name
    if (tempNames.has(arg)) return arg;
    return arg;
  }

  return instructions.map(instr => ({
    step:     instr.step,
    operator: instr.operator,
    arg1:     resolveArg(instr.op1),
    arg2:     resolveArg(instr.op2),
  }));
}

/**
 * Build Indirect Triples from triples list.
 *   The "pointer array" is a separate list [p0, p1, p2 …] where each
 *   entry stores the index of the triple it points to.
 *   In a simple sequential program they are identity-mapped, but this
 *   structure allows reordering without renumbering the triples table.
 */
function buildIndirectTriples(triples) {
  // Pointer array starts at 100 (100, 101, 102 …)
  // This clearly separates pointer indices from triple step numbers (0, 1, 2 …)
  const BASE = 100;
  const pointerArray = triples.map((triple, i) => ({
    pointer_index: BASE + i,      // e.g. 100, 101, 102 …
    triple_index:  triple.step,   // references the triples table step
  }));

  return { pointerArray, triples };
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Generate all four intermediate representations from an AST.
 * @param {object} ast   Root AST node from parser.parse()
 * @returns {{
 *   tac: object[],
 *   tacStrings: string[],
 *   quadruples: object[],
 *   triples: object[],
 *   indirectTriples: { pointerArray: object[], triples: object[] }
 * }}
 */
function generateIR(ast) {
  const { instructions }    = buildTAC(ast);
  const tacStrings          = buildTACStrings(instructions);
  const quadruples          = buildQuadruples(instructions);
  const triples             = buildTriples(instructions);
  const indirectTriples     = buildIndirectTriples(triples);

  return {
    tac:            instructions,
    tacStrings,
    quadruples,
    triples,
    indirectTriples,
  };
}

module.exports = { generateIR };
