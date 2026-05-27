import axios from 'axios';

async function listUsers() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  const superAdminEmail = 'superadmin@dev.com';
  const password = 'rabbit123';
  const tenantCode = 'dev';

  try {
    console.log(`Attempting to login to the cloud backend as Super Admin (${superAdminEmail})...`);
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: superAdminEmail,
      password: password,
      tenantCode: tenantCode
    });

    const token = loginRes.data.data.accessToken;
    console.log('Login successful! Fetching users from the cloud database...\n');

    const usersRes = await axios.get(`${backendUrl}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Code': tenantCode
      }
    });

    const users = usersRes.data.data;
    console.log(`Found ${users.length} users in the cloud database for workspace/tenant "${tenantCode}":`);
    console.log('========================================================================');
    
    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. [ID: ${user.id}] ${user.name} | Role: ${user.role} | Email: ${user.email}`);
    });
    
    console.log('========================================================================');
  } catch (error: any) {
    console.error('Failed to query the cloud database:', error.response?.status, error.response?.data || error.message);
  }
}

listUsers();
