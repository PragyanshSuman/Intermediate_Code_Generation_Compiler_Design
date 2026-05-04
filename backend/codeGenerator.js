'use strict';

/**
 * Simple x86-like Assembly Generator from TAC.
 */
function generateAssembly(tac) {
  const assembly = [];
  
  function emit(instr) {
    assembly.push(instr);
  }

  emit('; --- Target Assembly Code ---');

  for (const instr of tac) {
    if (instr.operator === 'LABEL') {
      emit(`${instr.result}:`);
      continue;
    }
    if (instr.operator === 'GOTO') {
      emit(`  JMP ${instr.result}`);
      continue;
    }
    if (instr.operator === 'ifFalse') {
      emit(`  CMP ${instr.op1}, 0`);
      emit(`  JE ${instr.result}`);
      continue;
    }
    if (instr.operator === 'param') {
      emit(`  PUSH ${instr.op1}`);
      continue;
    }
    if (instr.operator === 'call') {
      emit(`  CALL ${instr.op1}`);
      emit(`  MOV ${instr.result}, EAX`);
      continue;
    }
    if (instr.operator === 'return') {
      if (instr.op1) emit(`  MOV EAX, ${instr.op1}`);
      emit(`  RET`);
      continue;
    }

    if (instr.operator === '=') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (instr.operator === '+') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  ADD EAX, ${instr.op2}`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (instr.operator === '-') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  SUB EAX, ${instr.op2}`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (instr.operator === '*') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  IMUL EAX, ${instr.op2}`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (instr.operator === '/') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  CDQ`);
      emit(`  MOV EBX, ${instr.op2}`);
      emit(`  IDIV EBX`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (instr.operator === '%') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  CDQ`);
      emit(`  MOV EBX, ${instr.op2}`);
      emit(`  IDIV EBX`);
      emit(`  MOV ${instr.result}, EDX`);
    } else if (instr.operator === 'UMINUS') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  NEG EAX`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (['==', '!=', '<', '<=', '>', '>='].includes(instr.operator)) {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  CMP EAX, ${instr.op2}`);
      let setInstr = '';
      switch (instr.operator) {
        case '==': setInstr = 'SETE'; break;
        case '!=': setInstr = 'SETNE'; break;
        case '<': setInstr = 'SETL'; break;
        case '<=': setInstr = 'SETLE'; break;
        case '>': setInstr = 'SETG'; break;
        case '>=': setInstr = 'SETGE'; break;
      }
      emit(`  ${setInstr} AL`);
      emit(`  MOVZX EAX, AL`);
      emit(`  MOV ${instr.result}, EAX`);
    } else if (['&&', '||'].includes(instr.operator)) {
      emit(`  MOV EAX, ${instr.op1}`);
      if (instr.operator === '&&') {
        emit(`  AND EAX, ${instr.op2}`);
      } else {
        emit(`  OR EAX, ${instr.op2}`);
      }
      emit(`  MOV ${instr.result}, EAX`);
    } else if (instr.operator === 'NOT') {
      emit(`  MOV EAX, ${instr.op1}`);
      emit(`  CMP EAX, 0`);
      emit(`  SETE AL`);
      emit(`  MOVZX EAX, AL`);
      emit(`  MOV ${instr.result}, EAX`);
    }
  }

  return assembly;
}

module.exports = { generateAssembly };
