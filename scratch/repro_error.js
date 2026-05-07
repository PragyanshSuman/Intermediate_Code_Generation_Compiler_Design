const snippetParser = require('../backend/snippetParser');
const snippetIrGenerator = require('../backend/snippetIrGenerator');

const src = `
#include <stdio.h>
int main() {
    int num = 121;
    while(num != 0) {
        num /= 10;
    }
    return 0;
}
`;

try {
    const { ast } = snippetParser.parse(src);
    console.log('AST generated successfully');
    const ir = snippetIrGenerator.generateIR(ast);
    console.log('IR generated successfully, steps:', ir.tac.length);
    console.log('--- TAC ---');
    console.log(ir.tacStrings.join('\n'));
} catch (e) {
    console.error('Test failed:', e.message);
    console.error(e.stack);
}
