const fs = require('fs');
let code = fs.readFileSync('backend/routes/compile.js', 'utf8');

// Find the res.json block in /compile route
const resJsonRegex = /return res\.json\(\{[\s\S]*?\}\);/m;
const match = code.match(resJsonRegex);

if (match) {
    let block = match[0];
    // Remove the duplicates
    const lines = block.split('\n');
    const seen = new Set();
    const newLines = [];
    for (let line of lines) {
        let trimmed = line.trim();
        // Check for duplicate keys in the object
        if (trimmed.endsWith(',') || trimmed.endsWith('}')) {
            let keyMatch = trimmed.match(/^(\w+):/);
            if (keyMatch) {
                let key = keyMatch[1];
                if (seen.has(key)) continue;
                seen.add(key);
            }
        }
        newLines.push(line);
    }
    code = code.replace(block, newLines.join('\n'));
}

fs.writeFileSync('backend/routes/compile.js', code);
console.log('Cleaned up duplicate keys in compile.js');
