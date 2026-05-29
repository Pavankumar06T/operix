const https = require('https');

// First login to get token
const loginReq = https.request('https://operix-backend-3utf.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const token = data.data.accessToken;
    const userId = data.data.user.id;
    
    // Now fetch technologies
    const techReq = https.request(`https://operix-backend-3utf.onrender.com/api/tracking/technologies/${userId}?period=week`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log("Technologies:", JSON.parse(body2));
      });
    });
    techReq.end();
  });
});
loginReq.write(JSON.stringify({ email: 'pavan@kaisenspark.com', password: 'Manager@123' }));
loginReq.end();
