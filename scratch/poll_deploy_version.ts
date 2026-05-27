import axios from 'axios';

async function poll() {
  const url = 'https://rabbit-backend-p765.onrender.com/health';
  console.log('Polling production backend health check for version 1.0.9-access-requests...');
  
  for (let i = 0; i < 40; i++) {
    try {
      const res = await axios.get(url);
      const data = res.data;
      console.log(`[Attempt ${i + 1}/40] Deployed version: "${data.version}", Database: "${data.database}"`);
      if (data.version === '1.0.9-access-requests') {
        console.log('\nSUCCESS! Deployed version 1.0.9-access-requests is now live and healthy in production! 🎉');
        return;
      }
    } catch (e: any) {
      console.log(`[Attempt ${i + 1}/40] Waiting for server to wake up/deploy... Error: ${e.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 8000));
  }
  console.log('Timeout waiting for version 1.0.9-access-requests to deploy.');
}

poll();
