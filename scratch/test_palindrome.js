const snippetParser = require('../backend/snippetParser');
const snippetIrGenerator = require('../backend/snippetIrGenerator');

const src = `
#include <stdio.h>
int main() {
    int num = 121, temp, rev = 0, digit;
    temp = num;
    while(num != 0) {
        digit = num % 10;
        rev = rev * 10 + digit;
        num = num / 10;
    }
    if(temp == rev)
        printf("Palindrome\\n");
    else
        printf("Not Palindrome\\n");
    return 0;
}
`;

try {
    const { ast } = snippetParser.parse(src);
    console.log('AST generated successfully');
    const ir = snippetIrGenerator.generateIR(ast);
    console.log('IR generated successfully');
    console.log('--- TAC ---');
    console.log(ir.tacStrings.join('\\n'));
} catch (e) {
    console.error('Test failed:', e.message);
}
