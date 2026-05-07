const fs = require('fs');

let code = fs.readFileSync('backend/routes/compile.js', 'utf8');

// Fix /compile route
code = code.replace(
  /let ast, ir;[\s\S]*?try \{[\s\S]*?ast = parse\(expression\.trim\(\)\);[\s\S]*?ir\s*=\s*generateIR\(ast\);/,
  `let ast, ir, tokens, optimizedTac, optimizedTacStrings, assembly;
  try {
    const parsed = parse(expression.trim());
    ast = parsed.ast;
    tokens = parsed.tokens;
    ir  = generateIR(ast);
    const opt = optimizeTAC(ir.tac);
    optimizedTac = opt.optimizedTac;
    optimizedTacStrings = opt.optimizedTacStrings;
    assembly = generateAssembly(optimizedTac);`
);

// Fix /compile-snippet route
code = code.replace(
  /let ast, ir;[\s\S]*?try \{[\s\S]*?ast = snippetParser\.parse\(expression\.trim\(\)\);[\s\S]*?ir\s*=\s*snippetIrGenerator\.generateIR\(ast\);/,
  `let ast, ir, tokens, optimizedTac, optimizedTacStrings, assembly;
  try {
    const parsed = snippetParser.parse(expression.trim());
    ast = parsed.ast;
    tokens = parsed.tokens;
    ir  = snippetIrGenerator.generateIR(ast);
    const opt = optimizeTAC(ir.tac);
    optimizedTac = opt.optimizedTac;
    optimizedTacStrings = opt.optimizedTacStrings;
    assembly = generateAssembly(optimizedTac);`
);

// Fix return res.json in both compile routes to include the new fields
const newJsonFields = `success: true,
      sessionId,
      tokens,
      optimizedTac: optimizedTac.map((instr, i) => ({ step: instr.step, result: instr.result ?? '-', op1: instr.op1 ?? '-', operator: instr.operator, op2: instr.op2 ?? '-', tacString: optimizedTacStrings[i] || '' })),
      assembly,`;

// We need to be careful with the replacement. Let's find the specific res.json calls.
// First one (/compile)
code = code.replace(
  /return res\.json\(\{\s*success: true,\s*sessionId,/,
  "return res.json({\n      " + newJsonFields
);

// Second one (/compile-snippet)
// Note: We need to skip the first one if we already replaced it, or use a global replace if they are identical.
// In our case they are similar. Let's use split/join for safety if they are exactly the same or just use a loop.
let parts = code.split(/return res\.json\(\{\s*success: true,\s*sessionId,/);
if (parts.length > 1) {
    code = parts.join("return res.json({\n      " + newJsonFields);
}

fs.writeFileSync('backend/routes/compile.js', code);
console.log('Successfully fixed backend/routes/compile.js');
