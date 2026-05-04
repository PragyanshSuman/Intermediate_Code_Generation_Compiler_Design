'use strict';

/**
 * Basic Code Optimizer for TAC
 * Implements Constant Folding and Copy Propagation.
 */
function optimizeTAC(tac) {
  let optimized = JSON.parse(JSON.stringify(tac)); // deep copy
  let changed = true;

  while (changed) {
    changed = false;
    const constantMap = {}; // Tracks known constants for variables
    const copyMap = {};     // Tracks known copies for variables (t1 -> t2)

    for (let i = 0; i < optimized.length; i++) {
      const instr = optimized[i];

      // Reset maps on labels (conservative)
      if (instr.operator === 'LABEL') {
        for (let key in constantMap) delete constantMap[key];
        for (let key in copyMap) delete copyMap[key];
        continue;
      }

      // Replace operands with constants or copies if known
      if (instr.op1 && constantMap[instr.op1] !== undefined) {
        instr.op1 = constantMap[instr.op1];
        changed = true;
      } else if (instr.op1 && copyMap[instr.op1] !== undefined) {
        instr.op1 = copyMap[instr.op1];
        changed = true;
      }

      if (instr.op2 && instr.op2 !== '-' && constantMap[instr.op2] !== undefined) {
        instr.op2 = constantMap[instr.op2];
        changed = true;
      } else if (instr.op2 && instr.op2 !== '-' && copyMap[instr.op2] !== undefined) {
        instr.op2 = copyMap[instr.op2];
        changed = true;
      }

      // Constant Folding
      if (['+', '-', '*', '/', '%'].includes(instr.operator) && !isNaN(instr.op1) && !isNaN(instr.op2)) {
        const v1 = parseFloat(instr.op1);
        const v2 = parseFloat(instr.op2);
        let res = null;
        switch (instr.operator) {
          case '+': res = v1 + v2; break;
          case '-': res = v1 - v2; break;
          case '*': res = v1 * v2; break;
          case '/': res = v1 / v2; break;
          case '%': res = v1 % v2; break;
        }
        if (res !== null) {
          instr.operator = '=';
          instr.op1 = String(res);
          instr.op2 = null;
          changed = true;
        }
      }

      // Record constants and copies
      if (instr.operator === '=') {
        if (!isNaN(instr.op1)) {
          constantMap[instr.result] = instr.op1;
        } else {
          // If op1 is another variable, record the copy
          copyMap[instr.result] = instr.op1;
        }
      } else {
        // If the result is reassigned, remove it from maps
        delete constantMap[instr.result];
        delete copyMap[instr.result];
      }
    }
  }

  // Build string representation for optimized TAC
  const optimizedStrings = optimized.map(instr => {
    if (instr.operator === 'LABEL') return `LABEL ${instr.result}`;
    if (instr.operator === 'GOTO') return `GOTO ${instr.result}`;
    if (instr.operator === 'ifFalse') return `ifFalse ${instr.op1} GOTO ${instr.result}`;
    if (instr.operator === 'param') return `param "${instr.op1}"`;
    if (instr.operator === 'call') return `${instr.result} = CALL ${instr.op1}, ${instr.op2}`;
    if (instr.operator === 'return') return `return ${instr.op1 || ''}`;
    
    if (instr.op2 === null || instr.op2 === undefined || instr.op2 === '-') {
      if (instr.operator === '=') return `${instr.result} = ${instr.op1}`;
      if (instr.operator === 'UMINUS') return `${instr.result} = -${instr.op1}`;
      if (instr.operator === 'NOT') return `${instr.result} = !${instr.op1}`;
      return `${instr.result} = ${instr.operator} ${instr.op1}`;
    }
    return `${instr.result} = ${instr.op1} ${instr.operator} ${instr.op2}`;
  });

  return { optimizedTac: optimized, optimizedTacStrings: optimizedStrings };
}

module.exports = { optimizeTAC };
