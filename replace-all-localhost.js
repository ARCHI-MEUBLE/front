const fs = require('fs');
const path = require('path');

// Files to fix based on grep output
const files = [
  'src/pages/account.tsx',
  'src/pages/cart.tsx',
  'src/components/admin/DashboardConfigs.tsx',
  'src/components/admin/NotificationsModal.tsx',
  'src/components/admin/DashboardOrders.tsx',
  'src/components/UserNavigation.tsx',
  'src/pages/admin/orders.tsx',
  'src/components/Header.tsx',
  'src/pages/admin/dashboard.tsx',
  'src/pages/admin/notifications.tsx',
  'src/components/ProfileModal.tsx',
  'src/pages/order-confirmation/[orderId].tsx',
  'src/pages/my-configurations.tsx',
  'src/pages/my-orders.tsx',
  'src/pages/configurator/[id].tsx',
  'src/pages/checkout.tsx',
  'src/pages/configurator/select.tsx',
];

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`- Skipped (not found): ${file}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace all fetch calls with hardcoded localhost:8000
    const patterns = [
      {
        from: /'http:\/\/localhost:8000\/backend\/api\//g,
        to: "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/"
      },
      {
        from: /"http:\/\/localhost:8000\/backend\/api\//g,
        to: "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/"
      },
      {
        from: /`http:\/\/localhost:8000\/backend\/api\//g,
        to: "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api/"
      },
    ];

    patterns.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    } else {
      console.log(`- No changes needed: ${file}`);
    }
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n${fixedCount} files fixed successfully.`);
