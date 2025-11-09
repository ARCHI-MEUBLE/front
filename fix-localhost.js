const fs = require('fs');
const path = require('path');

const API_URL_CONST = "process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'";

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Remplacer toutes les occurrences de localhost:8000
    // 'http://localhost:8000' (simple quotes)
    content = content.replace(/'http:\/\/localhost:8000'/g, API_URL_CONST);
    // "http://localhost:8000" (double quotes)
    content = content.replace(/"http:\/\/localhost:8000"/g, API_URL_CONST);

    // Template literals: `http://localhost:8000` standalone
    content = content.replace(/`http:\/\/localhost:8000`/g, "`${" + API_URL_CONST + "}`");

    // Template literals: `http://localhost:8000/path`
    content = content.replace(/`http:\/\/localhost:8000\//g, "`${" + API_URL_CONST + "}/");

    // Template literals: 'http://localhost:8000/path'
    content = content.replace(/'http:\/\/localhost:8000\//g, API_URL_CONST + " + '/");

    // Template literals: "http://localhost:8000/path"
    content = content.replace(/"http:\/\/localhost:8000\//g, API_URL_CONST + " + \"/");

    // Dans les template literals avec d'autres variables: ${'http://localhost:8000'}
    content = content.replace(/\$\{['"]http:\/\/localhost:8000['"]\}/g, "${" + API_URL_CONST + "}");

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

    if (stat.isDirectory()) {
      fixed += walkDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (replaceInFile(filePath)) {
        fixed++;
      }
    }
  }

  return fixed;
}

console.log('🔧 Fixing hardcoded localhost URLs...\n');
const srcPath = path.join(__dirname, 'src');
const fixed = walkDirectory(srcPath);
console.log(`\n✅ Fixed ${fixed} files!`);
