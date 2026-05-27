import axios from 'axios';

async function listUsers() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  
  // Try dev tenant first
  try {
    console.log('--- DEV Tenant ---');
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'employee@dev.com',
      password: 'rabbit123',
      tenantCode: 'dev'
    });
    const token = loginRes.data.data.accessToken;
    const usersRes = await axios.get(`${backendUrl}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    usersRes.data.data.forEach((u: any) => {
      console.log(`Role: ${u.role}, Email: ${u.email}, Name: ${u.name}`);
    });
  } catch (err: any) {
    console.log('Failed for dev tenant:', err.message);
  }

  // Try acme tenant
  try {
    console.log('\n--- ACME Tenant ---');
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'accounts@acme.com',
      password: 'rabbit123',
      tenantCode: 'acme'
    });
    const token = loginRes.data.data.accessToken;
    const usersRes = await axios.get(`${backendUrl}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    usersRes.data.data.forEach((u: any) => {
      console.log(`Role: ${u.role}, Email: ${u.email}, Name: ${u.name}`);
    });
  } catch (err: any) {
    console.log('Failed for acme tenant:', err.message);
  }
}

listUsers();
