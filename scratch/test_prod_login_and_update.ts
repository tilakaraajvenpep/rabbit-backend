import axios from 'axios';

async function testProd() {
  const host = 'https://rabbit-backend-p765.onrender.com';
  console.log(`Using production host: ${host}`);

  try {
    // 1. Login
    console.log('Logging in as pm@venpep.com...');
    const loginRes = await axios.post(`${host}/api/auth/login`, {
      email: 'pm@venpep.com',
      password: 'rabbit123',
      tenantCode: 'venpep'
    });
    const token = loginRes.data.data.accessToken;
    console.log('Login successful, token retrieved.');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 2. Get users before update
    console.log('Fetching users before update...');
    const usersBefore = await axios.get(`${host}/api/users`, { headers });
    const user40Before = usersBefore.data.data.find((u: any) => u.id === 40);
    console.log('User 40 before update:', user40Before);

    // 3. Update team lead of user 40 to 43 (TR)
    console.log('Updating user 40 team lead to 43...');
    const updateRes = await axios.put(`${host}/api/users/40/team-lead`, { teamLeadId: 43 }, { headers });
    console.log('Update status:', updateRes.status);
    console.log('Update response data:', JSON.stringify(updateRes.data));

    // 4. Get users after update
    console.log('Fetching users after update...');
    const usersAfter = await axios.get(`${host}/api/users`, { headers });
    const user40After = usersAfter.data.data.find((u: any) => u.id === 40);
    console.log('User 40 after update:', user40After);

  } catch (error: any) {
    if (error.response) {
      console.error('Error response:', error.response.status, JSON.stringify(error.response.data));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testProd();
