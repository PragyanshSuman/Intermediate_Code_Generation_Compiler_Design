const snippetParser = require('../backend/snippetParser');

const src3 = `
#include <stdio.h>
int main() {
    float x = 10;
    char y = "A"; // using string for now to avoid char literal error
    return 0;
}
`;

console.log('--- Testing Keywords ---');
try {
    snippetParser.parse(src3);
    console.log('Keywords parsed successfully');
} catch (e) {
    console.error('Keywords failed:', e.message);
}
