import axios from 'axios';

async function test() {
  try {
    // login as admin
    const loginRes = await axios.post('https://rabbit-backend-p765.onrender.com/api/auth/login', {
      email: 'admin@venpep.com',
      password: 'rabbit123',
      tenantCode: 'venpep'
    });
    console.log("Login Response:", loginRes.data);
    const token = loginRes.data.data.accessToken || loginRes.data.data.token;
    
    // fetch users
    const usersRes = await axios.get('https://rabbit-backend-p765.onrender.com/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Users:", usersRes.data.data.slice(0, 2));
  } catch (err) {
    console.log("Error:", err.response?.data || err.message || err);
  }
}

test();
