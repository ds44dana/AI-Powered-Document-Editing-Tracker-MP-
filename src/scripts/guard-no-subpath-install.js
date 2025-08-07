const fs = require('fs');
const path = require('path');
function scan(dir) {
  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(p);else if (entry.name === 'package.json') {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
      const text = JSON.stringify(pkg);
      if (/pdfjs-dist\/build\/pdf/.test(text)) {
        console.error(`❌ Found invalid subpath dependency in ${p}`);
        process.exit(1);
      }
    }
  }
}
scan(process.cwd());
console.log('✅ No invalid subpath dependencies found');