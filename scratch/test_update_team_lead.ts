import axios from 'axios';

async function testUpdate() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  const superAdminEmail = 'superadmin@dev.com';
  const password = 'rabbit123';
  const tenantCode = 'dev';

  try {
    console.log('Logging in as Super Admin...');
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: superAdminEmail,
      password: password,
      tenantCode: tenantCode
    });

    const token = loginRes.data.data.accessToken;

    // Get initial user list
    console.log('Fetching users before update...');
    const listRes = await axios.get(`${backendUrl}/api/users`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Code': tenantCode }
    });
    
    // Find an employee (e.g. Employee User with ID 6)
    const emp = listRes.data.data.find((u: any) => u.role === 'Employee');
    if (!emp) {
      console.log('No employee user found to test with.');
      return;
    }

    console.log(`\nFound employee to test: [ID: ${emp.id}] ${emp.name}, current teamLeadId: ${emp.teamLeadId}`);

    // Update teamLeadId to 5 (Team Lead)
    console.log(`Updating employee's team lead to 5...`);
    const updateRes = await axios.put(`${backendUrl}/api/users/${emp.id}/team-lead`, {
      teamLeadId: 5
    }, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Code': tenantCode }
    });

    console.log('Update response status:', updateRes.status);
    console.log('Update response data:', JSON.stringify(updateRes.data));

    // Fetch users after update
    console.log('\nFetching users after update...');
    const listRes2 = await axios.get(`${backendUrl}/api/users`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Code': tenantCode }
    });

    const empAfter = listRes2.data.data.find((u: any) => u.id === emp.id);
    if (!empAfter) {
      console.log(`CRITICAL: User [ID: ${emp.id}] is no longer in the list after update!`);
    } else {
      console.log(`User [ID: ${empAfter.id}] is STILL in the list! teamLeadId is now: ${empAfter.teamLeadId}`);
    }

  } catch (error: any) {
    console.error('Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

testUpdate();
