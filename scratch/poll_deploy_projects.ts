import axios from 'axios';

async function poll() {
  const url = 'https://rabbit-backend-p765.onrender.com/api/projects';
  console.log('Polling production GET /api/projects route...');
  
  for (let i = 0; i < 40; i++) {
    try {
      await axios.get(url);
    } catch (e: any) {
      const status = e.response?.status;
      if (status === 401 || status === 403 || status === 400) {
        console.log(`\nSUCCESS! Production backend is live and healthy! Server responded with status: ${status} (expected auth error)`);
        return;
      }
      console.log(`[Attempt ${i + 1}/40] Waiting... Status code: ${status || e.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
  console.log('Timeout waiting for deployment.');
}

poll();
