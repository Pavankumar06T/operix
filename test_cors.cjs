const https = require('https');

const req = https.request('https://operix-backend-3utf.onrender.com/api/auth/login', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://operix-frontend-9ijz.onrender.com',
    'Access-Control-Request-Method': 'POST'
  }
}, (res) => {
  console.log("CORS Headers:", res.headers['access-control-allow-origin']);
});
req.end();
