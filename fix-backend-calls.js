const fs = require('fs');
const path = require('path');

// Map backend URLs to Next.js API routes
const replacements = [
  // Admin notifications
  {
    pattern: /\(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\) \+ '\/backend\/api\/admin\/notifications\.php/g,
    replacement: "'/api/admin/notifications"
  },
  {
    pattern: /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\}\/backend\/api\/admin\/notifications\.php/g,
    replacement: "`/api/admin/notifications"
  },

  // Admin orders
  {
    pattern: /\(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\) \+ '\/backend\/api\/admin\/orders\.php/g,
    replacement: "'/api/admin/orders"
  },
  {
    pattern: /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\}\/backend\/api\/admin\/orders\.php/g,
    replacement: "`/api/admin/orders"
  },

  // Payment analytics
  {
    pattern: /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\}\/backend\/api\/admin\/payment-analytics\.php/g,
    replacement: "`/api/admin/payment-analytics"
  },

  // Recent transactions
  {
    pattern: /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\}\/backend\/api\/admin\/recent-transactions\.php/g,
    replacement: "`/api/admin/recent-transactions"
  },

  // Configurations
  {
    pattern: /\(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\) \+ '\/backend\/api\/admin\/configurations\.php/g,
    replacement: "'/api/admin/configurations"
  },

  // Calendly appointments
  {
    pattern: /\(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\) \+ '\/backend\/api\/calendly\/appointments\.php/g,
    replacement: "'/api/admin/appointments"
  },

  // Calendly appointments stats
  {
    pattern: /\(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:8000'\) \+ '\/backend\/api\/calendly\/appointments-stats\.php/g,
    replacement: "'/api/admin/appointments-stats"
  }
];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    replacements.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });

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

console.log('🔧 Replacing direct backend calls with API routes...\n');
const srcPath = path.join(__dirname, 'src');
const fixed = walkDirectory(srcPath);
console.log(`\n✅ Fixed ${fixed} files!`);
