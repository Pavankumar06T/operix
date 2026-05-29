const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('https://operix-backend-3utf.onrender.com/api/auth/login', {
      email: 'pavan@kaisenspark.com',
      password: 'Manager@123'
    });
    console.log("SUCCESS:");
    console.log(res.data);
  } catch (err) {
    console.log("ERROR:");
    console.log(err.response?.data || err.message);
  }
}

test();
