const snippetParser = require('../backend/snippetParser');
const snippetIrGenerator = require('../backend/snippetIrGenerator');
const { optimizeTAC } = require('../backend/optimizer');
const { generateAssembly } = require('../backend/codeGenerator');

const src = `#include

int main() {
    int i, j;

    for(i = 1; i <= 5; i++) {
        for(j = 1; j <= 5; j++) {
            printf(\"%d \", i * j);
        }
        printf(\"\\n\");
    }

    return 0;
}`;

try {
    const { ast, tokens } = snippetParser.parse(src);
    console.log('AST generated successfully');
    const ir = snippetIrGenerator.generateIR(ast);
    console.log('IR generated successfully, steps:', ir.tac.length);
    const { optimizedTac, optimizedTacStrings } = optimizeTAC(ir.tac);
    console.log('Optimization successful, optimized steps:', optimizedTac.length);
    const assembly = generateAssembly(optimizedTac);
    console.log('Assembly generation successful, lines:', assembly.length);
    console.log('--- Assembly ---');
    console.log(assembly.join('\n'));
} catch (e) {
    console.error('Test failed:', e.message);
}
