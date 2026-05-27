import axios from 'axios';

async function listVenpepUsers() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  
  try {
    console.log('Logging in as PM...');
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'pm@venpep.com',
      password: 'rabbit123',
      tenantCode: 'venpep'
    });
    const token = loginRes.data.data.accessToken;
    const usersRes = await axios.get(`${backendUrl}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('--- VENPEP USERS ---');
    usersRes.data.data.forEach((u: any) => {
      console.log(`Role: ${u.role}, Email: ${u.email}, Name: ${u.name}`);
    });
  } catch (err: any) {
    console.log('Failed:', err.message);
  }
}

listVenpepUsers();
