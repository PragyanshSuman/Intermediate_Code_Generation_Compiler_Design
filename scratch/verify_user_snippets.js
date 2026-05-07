const snippetParser = require('../backend/snippetParser');
const snippetIrGenerator = require('../backend/snippetIrGenerator');

const src1 = `
#include <stdio.h>
int main() {
if(income<=250000) 
tax=0;
else if(income<=500000) 
tax=income*0.05;
else if(income<=1000000) 
tax=income*0.2;
else 
tax=income*0.3;
printf("Tax = %.2f", tax);
return 0;
}
`;

const src2 = `
#include <stdio.h>
int main() {
    char ch = 'A';
    if((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'))
 {
        if (ch=='a'||ch=='e'||ch=='i'||ch=='o'||ch=='u'|| ch=='A'||ch=='E'||ch=='I'||ch=='O'||ch=='U')
            printf("Vowel\\n");
        else
            printf("Consonant\\n");
    } else if(ch >= '0' && ch <= '9') {
        printf("Digit\\n");
    } else {
        printf("Special Character\\n");
    }
    return 0;
}
`;

function test(name, src) {
    console.log('--- Testing ' + name + ' ---');
    try {
        const { ast } = snippetParser.parse(src);
        console.log(name + ' AST generated successfully');
        const ir = snippetIrGenerator.generateIR(ast);
        console.log(name + ' IR generated successfully');
        console.log('TAC steps:', ir.tac.length);
    } catch (e) {
        console.error(name + ' failed:', e.message);
    }
}

test('Tax Snippet', src1);
test('Char Snippet', src2);
