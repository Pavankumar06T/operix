// Quick test script to verify all API keys
import dotenv from 'dotenv';
dotenv.config();

async function testAll() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  Operix — API Key Verification');
  console.log('═══════════════════════════════════════');
  console.log('');

  // 1. Test Supabase
  console.log('1️⃣  Testing Supabase...');
  try {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!sbUrl || !sbKey) {
      console.log('   ❌ SUPABASE_URL or SUPABASE_SERVICE_KEY is missing');
    } else {
      const res = await fetch(`${sbUrl}/rest/v1/users?select=count&limit=1`, {
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`   ✅ Supabase connected! Response status: ${res.status}`);
        console.log(`   📊 Users table accessible: ${JSON.stringify(data)}`);
      } else {
        const errText = await res.text();
        console.log(`   ❌ Supabase error (${res.status}): ${errText}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Supabase connection failed: ${(err as Error).message}`);
  }

  console.log('');

  // 2. Test Gemini API
  console.log('2️⃣  Testing Google Gemini AI...');
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.log('   ❌ GEMINI_API_KEY is missing');
    } else {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "Hello Operix" in exactly 2 words.' }] }],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        console.log(`   ✅ Gemini AI is working!`);
        console.log(`   🤖 AI replied: "${reply.trim()}"`);
      } else {
        const errText = await res.text();
        console.log(`   ❌ Gemini error (${res.status}): ${errText.slice(0, 200)}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Gemini connection failed: ${(err as Error).message}`);
  }

  console.log('');

  // 3. Test Resend
  console.log('3️⃣  Testing Resend Email...');
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.log('   ❌ RESEND_API_KEY is missing');
    } else {
      const res = await fetch('https://api.resend.com/api-keys', {
        headers: { 'Authorization': `Bearer ${resendKey}` },
      });
      if (res.ok) {
        console.log(`   ✅ Resend API key is valid!`);
      } else {
        const errText = await res.text();
        console.log(`   ❌ Resend error (${res.status}): ${errText.slice(0, 200)}`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Resend connection failed: ${(err as Error).message}`);
  }

  console.log('');

  // 4. Check JWT secret
  console.log('4️⃣  Checking JWT Secret...');
  const jwt = process.env.JWT_SECRET;
  if (!jwt) {
    console.log('   ❌ JWT_SECRET is missing');
  } else if (jwt.length < 20) {
    console.log(`   ⚠️  JWT_SECRET is weak (${jwt.length} chars). Use 32+ chars for production.`);
  } else {
    console.log(`   ✅ JWT_SECRET is set (${jwt.length} chars)`);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  Verification complete!');
  console.log('═══════════════════════════════════════');
  console.log('');
}

testAll();
