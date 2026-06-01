import axios from 'axios';

async function testUpdate() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  console.log('Testing HR update of team lead with polling...');
  
  for (let i = 0; i < 30; i++) {
    try {
      // 1. Login as HR
      const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
        email: 'hr@venpep.com',
        password: 'rabbit123',
        tenantCode: 'venpep'
      });
      const token = loginRes.data.data.accessToken;

      // 2. Try to update user 57 (testing) team lead to 56 (tl)
      const updateRes = await axios.put(
        `${backendUrl}/api/users/57/team-lead`,
        { teamLeadId: 56 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Update API response:', updateRes.data);
      console.log('SUCCESS! HR is successfully allowed to update team lead.');
      return;
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message;
      console.log(`[Attempt ${i + 1}/30] Waiting... Response: ${msg}`);
    }
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
  console.error('TEST TIMEOUT waiting for deployment.');
}

testUpdate();
