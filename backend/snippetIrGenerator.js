'use strict';

function buildTAC(ast) {
  const instructions = [];
  let tempCount = 0;
  let labelCount = 0;

  function newTemp() { return `t${++tempCount}`; }
  function newLabel() { return `L${++labelCount}`; }

  function emit(result, op1, operator, op2 = null) {
    const step = instructions.length;
    instructions.push({ step, result, op1, operator, op2 });
    return result;
  }
  
  function emitLabel(lbl) {
    const step = instructions.length;
    instructions.push({ step, result: lbl, op1: null, operator: 'LABEL', op2: null });
  }

  function emitGoto(lbl) {
    const step = instructions.length;
    instructions.push({ step, result: lbl, op1: null, operator: 'GOTO', op2: null });
  }

  function emitIfFalse(condTemp, lbl) {
    const step = instructions.length;
    instructions.push({ step, result: lbl, op1: condTemp, operator: 'ifFalse', op2: null });
  }

  function visit(node) {
    if (!node) return null;

    if (node.type === 'Program' || node.type === 'Block') {
      for (const stmt of node.body) visit(stmt);
      return null;
    }

    if (node.type === 'Function') {
      emitLabel(node.name);
      visit(node.body);
      return null;
    }

    if (node.type === 'ExprStmt') {
      return visit(node.expr);
    }

    if (node.type === 'VarDecl') {
      for (const decl of node.decls) {
        if (decl.init) {
          const val = visit(decl.init);
          emit(decl.id, val, '=', null);
        }
      }
      return null;
    }

    if (node.type === 'Assignment') {
      const rhs = visit(node.rhs);
      return emit(node.lhs, rhs, '=', null);
    }

    if (node.type === 'Number' || node.type === 'Identifier' || node.type === 'String') {
      return node.value;
    }

    if (node.type === 'BinaryOp') {
      const left = visit(node.left);
      const right = visit(node.right);
      const tmp = newTemp();
      return emit(tmp, left, node.op, right);
    }

    if (node.type === 'UnaryOp') {
      const operand = visit(node.operand);
      const tmp = newTemp();
      return emit(tmp, operand, node.op === '-' ? 'UMINUS' : 'NOT', null);
    }

    if (node.type === 'PostfixOp') {
      const opnd = node.operand.value;
      const tmp = newTemp();
      emit(tmp, opnd, node.op === '++' ? '+' : '-', '1');
      emit(opnd, tmp, '=', null);
      return opnd;
    }

    if (node.type === 'FunctionCall') {
      for (const arg of node.args) {
        const a = visit(arg);
        emit(null, a, 'param', null);
      }
      const tmp = newTemp();
      emit(tmp, node.name, 'call', node.args.length);
      return tmp;
    }

    if (node.type === 'IfElse') {
      const cond = visit(node.cond);
      const falseLbl = newLabel();
      const endLbl = node.falseBranch ? newLabel() : null;

      emitIfFalse(cond, falseLbl);
      visit(node.trueBranch);
      
      if (node.falseBranch) {
        emitGoto(endLbl);
        emitLabel(falseLbl);
        visit(node.falseBranch);
        emitLabel(endLbl);
      } else {
        emitLabel(falseLbl);
      }
      return null;
    }

    if (node.type === 'ForLoop') {
      if (node.init) visit(node.init);
      const startLbl = newLabel();
      const endLbl = newLabel();
      emitLabel(startLbl);
      
      if (node.cond) {
        const cond = visit(node.cond);
        emitIfFalse(cond, endLbl);
      }
      
      visit(node.body);
      
      if (node.inc) visit(node.inc);
      
      emitGoto(startLbl);
      emitLabel(endLbl);
      return null;
    }

    if (node.type === 'Return') {
      if (node.expr) {
        const val = visit(node.expr);
        emit(null, val, 'return', null);
      } else {
        emit(null, null, 'return', null);
      }
      return null;
    }

    throw new Error(`Unknown node type: ${node.type}`);
  }

  visit(ast);
  return { instructions };
}

function buildTACStrings(instructions) {
  return instructions.map(instr => {
    if (instr.operator === 'LABEL') return `${instr.result}:`;
    if (instr.operator === 'GOTO') return `goto ${instr.result}`;
    if (instr.operator === 'ifFalse') return `ifFalse ${instr.op1} goto ${instr.result}`;
    if (instr.operator === 'param') return `param ${instr.op1}`;
    if (instr.operator === 'call') return `${instr.result} = call ${instr.op1}, ${instr.op2}`;
    if (instr.operator === 'return') return `return ${instr.op1 || ''}`;
    
    if (instr.op2 === null || instr.op2 === undefined) {
      if (instr.operator === '=') return `${instr.result} = ${instr.op1}`;
      return `${instr.result} = ${instr.operator} ${instr.op1}`;
    }
    return `${instr.result} = ${instr.op1} ${instr.operator} ${instr.op2}`;
  });
}

function buildQuadruples(instructions) {
  return instructions.map(instr => ({
    step: instr.step,
    operator: instr.operator,
    arg1: instr.op1 !== null && instr.op1 !== undefined ? instr.op1 : '-',
    arg2: instr.op2 !== null && instr.op2 !== undefined ? instr.op2 : '-',
    result: instr.result !== null && instr.result !== undefined ? instr.result : '-'
  }));
}

function buildTriples(instructions) {
  const tempNames = new Set(instructions.map(i => i.result));
  function resolveArg(arg) {
    if (arg === null || arg === undefined) return '-';
    if (tempNames.has(arg)) return arg;
    return arg;
  }
  return instructions.map(instr => ({
    step: instr.step,
    operator: instr.operator,
    arg1: resolveArg(instr.op1),
    arg2: resolveArg(instr.op2)
  }));
}

function buildIndirectTriples(triples) {
  const BASE = 100;
  const pointerArray = triples.map((triple, i) => ({
    pointer_index: BASE + i,
    triple_index: triple.step
  }));
  return { pointerArray, triples };
}

function generateIR(ast) {
  const { instructions } = buildTAC(ast);
  const tacStrings = buildTACStrings(instructions);
  const quadruples = buildQuadruples(instructions);
  const triples = buildTriples(instructions);
  const indirectTriples = buildIndirectTriples(triples);

  return {
    tac: instructions,
    tacStrings,
    quadruples,
    triples,
    indirectTriples,
    ast // pass ast back for frontend rendering (may be complex)
  };
}

module.exports = { generateIR };
