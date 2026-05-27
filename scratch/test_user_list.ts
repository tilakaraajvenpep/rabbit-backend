import axios from 'axios';

async function test() {
  try {
    console.log('Logging in as employee...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'emp@acme.com',
      password: 'rabbit123',
      tenantCode: 'acme'
    });

    const token = loginRes.data.data.accessToken;
    console.log('Login successful. Token acquired.');

    console.log('Fetching users...');
    const usersRes = await axios.get('http://localhost:5000/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Code': 'acme'
      }
    });

    console.log('Users fetched:');
    usersRes.data.data.forEach((u: any) => {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, Email: ${u.email}`);
    });
  } catch (error: any) {
    console.error('Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

test();
