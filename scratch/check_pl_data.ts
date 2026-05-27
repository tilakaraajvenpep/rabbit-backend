import axios from 'axios';

async function checkPL() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  
  try {
    console.log('Logging in to venpep tenant...');
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'accounts@venpep.com',
      password: 'rabbit123',
      tenantCode: 'venpep'
    });
    const token = loginRes.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching projects...');
    const projRes = await axios.get(`${backendUrl}/api/projects`, { headers });
    const projects = projRes.data.data;
    console.log(`Fetched ${projects.length} projects.`);
    if (projects.length === 0) {
      console.log('No projects found.');
      return;
    }

    projects.forEach((proj: any) => {
      console.log(`- Project: ID=${proj.projectId}, Name=${proj.projectName}, Status=${proj.status}`);
    });

    const firstProj = projects[0];
    const projId = firstProj.projectId;
    console.log(`First project: ID=${projId}, Name=${firstProj.projectName}`);

    console.log(`Fetching details for project ${projId}...`);
    const detailsRes = await axios.get(`${backendUrl}/api/projects/${projId}`, { headers });
    console.log('Project Details response acquired:', JSON.stringify(detailsRes.data.data));

    console.log('Fetching users...');
    const usersRes = await axios.get(`${backendUrl}/api/users`, { headers });
    console.log('Users response acquired.');

    console.log(`Fetching tickets for project ${projId}...`);
    const ticketsRes = await axios.get(`${backendUrl}/api/projects/${projId}/tickets`, { headers });
    console.log(`Tickets response acquired. Found ${ticketsRes.data.data.length} tickets.`);

  } catch (err: any) {
    if (err.response) {
      console.error('Error Response Status:', err.response.status);
      console.error('Error Response Data:', JSON.stringify(err.response.data));
    } else {
      console.error('Error:', err.message);
    }
  }
}

checkPL();
