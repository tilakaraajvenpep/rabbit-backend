

async function testLogin() {
  const response = await fetch('http://localhost:5000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'teamlead@dev.com',
      password: 'rabbit123',
      tenantCode: 'dev'
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

testLogin();
