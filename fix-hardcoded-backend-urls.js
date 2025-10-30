const fs = require('fs');
const path = require('path');

const files = [
  'src/context/CustomerContext.tsx',
  'src/pages/account.tsx',
  'src/pages/order-confirmation/[orderId].tsx',
  'src/pages/my-configurations.tsx',
  'src/pages/my-orders.tsx',
  'src/pages/configurator/[id].tsx',
  'src/pages/cart.tsx',
  'src/pages/checkout.tsx',
  'src/pages/admin/orders.tsx',
  'src/pages/admin/notifications.tsx',
  'src/pages/admin/dashboard.tsx',
  'src/components/UserNavigation.tsx',
  'src/components/ProfileModal.tsx',
  'src/components/Header.tsx',
  'src/components/admin/NotificationsModal.tsx',
  'src/components/admin/DashboardOrders.tsx',
  'src/components/admin/DashboardConfigs.tsx'
];

const oldPattern = "'http://localhost:8000/backend/api'";
const newPattern = "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/backend/api`";

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(oldPattern)) {
      content = content.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixedCount++;
    } else {
      console.log(`- Skipped (already fixed): ${file}`);
    }
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n${fixedCount} files fixed successfully.`);
