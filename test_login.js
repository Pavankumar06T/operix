async function test() {
  const res = await fetch('https://operix-backend-3utf.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pavan@kaisenspark.com', password: 'Manager@123' })
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Data:", data);
}

test();
