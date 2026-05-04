const {parse} = require('./backend/snippetParser.js'); 
const {generateIR} = require('./backend/snippetIrGenerator.js'); 

const src = `
#include <stdio.h>
int main() {
    int i, j, n = 5;
    for(i = 1; i <= n; i++) {
        for(j = 1; j <= n; j++) {
            if(i == 1 || i == n || j == 1 || j == n)
                printf("* ");
            else
                printf("  ");
        }
        printf("\\n");
    }
    return 0;
}
`;

try {
  const ast = parse(src);
  const ir = generateIR(ast);
  console.log(ir.tacStrings);
} catch (e) {
  console.error("Parse Error:", e);
}
