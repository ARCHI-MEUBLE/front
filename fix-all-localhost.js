const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all .ts, .tsx, .js, .jsx files in src
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', { cwd: __dirname });

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace all variations of localhost:8000
    const replacements = [
      { from: "'http://localhost:8000'", to: "process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'" },
      { from: '"http://localhost:8000"', to: 'process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"' },
      { from: '`http://localhost:8000`', to: 'process.env.NEXT_PUBLIC_API_URL || `http://localhost:8000`' },
    ];

    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n${fixedCount} files fixed successfully.`);
