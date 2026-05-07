const fs = require('fs');

let code = fs.readFileSync('backend/routes/compile.js', 'utf8');

// Add imports
code = code.replace(
  "const snippetIrGenerator = require('../snippetIrGenerator');",
  "const snippetIrGenerator = require('../snippetIrGenerator');\nconst { optimizeTAC } = require('../optimizer');\nconst { generateAssembly } = require('../codeGenerator');"
);

// Update /compile try block
code = code.replace(
  /let ast, ir;\n\s*try \{\n\s*ast = parse\(expression\.trim\(\)\);\n\s*ir  = generateIR\(ast\);/g,
  "let ast, ir, tokens, optimizedTac, optimizedTacStrings, assembly;\n  try {\n    const parsed = parse(expression.trim());\n    ast = parsed.ast;\n    tokens = parsed.tokens;\n    ir  = generateIR(ast);\n    const opt = optimizeTAC(ir.tac);\n    optimizedTac = opt.optimizedTac;\n    optimizedTacStrings = opt.optimizedTacStrings;\n    assembly = generateAssembly(optimizedTac);"
);

// Update /compile-snippet try block
code = code.replace(
  /let ast, ir;\n\s*try \{\n\s*ast = snippetParser\.parse\(expression\.trim\(\)\);\n\s*ir  = snippetIrGenerator\.generateIR\(ast\);/g,
  "let ast, ir, tokens, optimizedTac, optimizedTacStrings, assembly;\n  try {\n    const parsed = snippetParser.parse(expression.trim());\n    ast = parsed.ast;\n    tokens = parsed.tokens;\n    ir  = snippetIrGenerator.generateIR(ast);\n    const opt = optimizeTAC(ir.tac);\n    optimizedTac = opt.optimizedTac;\n    optimizedTacStrings = opt.optimizedTacStrings;\n    assembly = generateAssembly(optimizedTac);"
);

// Add DB insertions to /compile and /compile-snippet
const dbInsertions = `
    for (let i = 0; i < tokens.length; i++) {
      await conn.execute('INSERT INTO tokens (session_id, token_index, type, value) VALUES (?, ?, ?, ?)', [sessionId, i, tokens[i].type, tokens[i].value]);
    }
    for (const instr of optimizedTac) {
      await conn.execute('INSERT INTO optimized_tac (session_id, step, result, op1, operator, op2, tac_string) VALUES (?, ?, ?, ?, ?, ?, ?)', [sessionId, instr.step, instr.result ?? '-', instr.op1 ?? '-', instr.operator, instr.op2 ?? null, optimizedTacStrings[instr.step] || '']);
    }
    for (let i = 0; i < assembly.length; i++) {
      await conn.execute('INSERT INTO assembly_code (session_id, line_index, instruction) VALUES (?, ?, ?)', [sessionId, i, assembly[i]]);
    }
`;

code = code.split('await conn.commit();').join(dbInsertions + '\n    await conn.commit();');

code = code.replace(
  /success: true,\n\s*sessionId,/g,
  "success: true,\n      sessionId,\n      tokens,\n      optimizedTac: optimizedTac.map((instr, i) => ({ step: instr.step, result: instr.result ?? '-', op1: instr.op1 ?? '-', operator: instr.operator, op2: instr.op2 ?? '-', tacString: optimizedTacStrings[i] || '' })),\n      assembly,"
);

code = code.replace(
  /const \[indirect\]= await pool\.execute\('SELECT \* FROM indirect_triples    WHERE session_id = \? ORDER BY pointer_index', \[id\]\);/,
  "const [indirect]= await pool.execute('SELECT * FROM indirect_triples    WHERE session_id = ? ORDER BY pointer_index', [id]);\n    const [tokens]  = await pool.execute('SELECT * FROM tokens              WHERE session_id = ? ORDER BY token_index', [id]);\n    const [optTac]  = await pool.execute('SELECT * FROM optimized_tac       WHERE session_id = ? ORDER BY step', [id]);\n    const [asm]     = await pool.execute('SELECT * FROM assembly_code       WHERE session_id = ? ORDER BY line_index', [id]);"
);

code = code.replace(
  /createdAt:\  session\.created_at,/g,
  "createdAt:  session.created_at,\n      tokens,\n      optimizedTac: optTac.map(r => ({ step: r.step, result: r.result, op1: r.op1, operator: r.operator, op2: r.op2 ?? '-', tacString: r.tac_string })),\n      assembly: asm.map(r => r.instruction),"
);

fs.writeFileSync('backend/routes/compile.js', code);
console.log('Successfully updated backend/routes/compile.js');
