const snippetParser = require('../backend/snippetParser');

const src1 = `
#include <stdio.h>
int main() {
    float tax = 0.05;
    return 0;
}
`;

const src2 = `
#include <stdio.h>
int main() {
    char ch = 'A';
    return 0;
}
`;

console.log('--- Testing Float ---');
try {
    snippetParser.parse(src1);
    console.log('Float parsed successfully');
} catch (e) {
    console.error('Float failed:', e.message);
}

console.log('--- Testing Char ---');
try {
    snippetParser.parse(src2);
    console.log('Char parsed successfully');
} catch (e) {
    console.error('Char failed:', e.message);
}
