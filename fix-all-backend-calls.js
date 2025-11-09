const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Pattern 1: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/backend/api/...'
    // Replace with: '/api/proxy/backend/api/...'
    content = content.replace(
      /\(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\) \+ '(\/backend\/api\/[^']+)'/g,
      "'$1'"
    );

    // Pattern 2: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/...`
    // Replace with: `/api/proxy/backend/api/...`
    content = content.replace(
      /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\}(\/backend\/api\/[^`}$]+)/g,
      "`$1"
    );

    // Pattern 3: Special case for template literals with variables in the path
    // `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/cart/${cartId}`
    // Keep the variable but remove the env var
    content = content.replace(
      /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\}(\/backend\/api\/[^`]+)\`/g,
      "`$1`"
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error in ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  let fixed = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixed += walkDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (replaceInFile(filePath)) {
        fixed++;
      }
    }
  }

  return fixed;
}

console.log('🔧 Replacing ALL direct backend calls with relative paths...\n');
const srcPath = path.join(__dirname, 'src');
const fixed = walkDirectory(srcPath);
console.log(`\n✅ Fixed ${fixed} files!`);
