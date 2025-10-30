const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('=== Server Check ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Attempting to connect to localhost:', PORT);

// Test if Next.js server is responding
setTimeout(() => {
  const req = http.request({
    host: 'localhost',
    port: PORT,
    path: '/',
    method: 'GET'
  }, (res) => {
    console.log('✓ Server responding on localhost:', res.statusCode);
  });

  req.on('error', (e) => {
    console.log('✗ Server not responding:', e.message);
  });

  req.end();
}, 2000);
