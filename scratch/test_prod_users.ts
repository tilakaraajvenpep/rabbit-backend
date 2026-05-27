import axios from 'axios';

async function test() {
  try {
    const backendUrl = 'https://rabbit-backend-p765.onrender.com';
    console.log('Logging in to production backend as employee...');
    
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'employee@dev.com',
      password: 'rabbit123',
      tenantCode: 'dev'
    });

    const token = loginRes.data.data.accessToken;
    console.log('Login successful. Token acquired.');

    console.log('Fetching users from production...');
    const usersRes = await axios.get(`${backendUrl}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Code': 'dev'
      }
    });

    console.log('Users fetched successfully from production. Count:', usersRes.data.data.length);
    usersRes.data.data.forEach((u: any) => {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Email: ${u.email}`);
    });
  } catch (error: any) {
    console.error('Production test failed:', error.response?.status, error.response?.data || error.message);
  }
}

test();
