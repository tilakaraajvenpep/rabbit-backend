import axios from 'axios';

async function testDownload() {
  const backendUrl = 'https://rabbit-backend-p765.onrender.com';
  
  try {
    console.log('Logging in as ProjectManager...');
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      email: 'pm@venpep.com',
      password: 'rabbit123',
      tenantCode: 'venpep'
    });
    const token = loginRes.data.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching projects...');
    const projRes = await axios.get(`${backendUrl}/api/projects`, { headers });
    const projects = projRes.data.data;
    if (projects.length === 0) {
      console.log('No projects found.');
      return;
    }

    const firstProj = projects[0];
    const projId = firstProj.projectId;
    console.log(`Using Project: ID=${projId}`);

    console.log('Fetching documents...');
    const docsRes = await axios.get(`${backendUrl}/api/projects/${projId}/documents`, { headers });
    const docs = docsRes.data.data;
    console.log(`Documents count: ${docs.length}`);
    if (docs.length === 0) {
      return;
    }

    const firstDoc = docs[0];
    const docId = firstDoc.documentId;
    console.log(`Downloading Document ID=${docId}, Name=${firstDoc.fileName}, Category=${firstDoc.documentCategory}`);

    const dlUrl = `${backendUrl}/api/projects/${projId}/documents/${docId}/download`;
    console.log(`Requesting GET ${dlUrl}`);
    const dlRes = await axios.get(dlUrl, {
      headers,
      responseType: 'arraybuffer'
    });
    console.log('Download Response Status:', dlRes.status);
    console.log('Download Content-Length:', dlRes.headers['content-length']);

  } catch (err: any) {
    if (err.response) {
      console.error('Error Status:', err.response.status);
      try {
        const text = Buffer.from(err.response.data).toString('utf8');
        console.error('Error Data:', text);
      } catch {
        console.error('Error Data (raw):', err.response.data);
      }
    } else {
      console.error('Error:', err.message);
    }
  }
}

testDownload();
