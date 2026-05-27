import axios from 'axios';

async function poll() {
  const url = 'https://rabbit-backend-p765.onrender.com/health/db-host';
  console.log('Polling database hostname diagnostic endpoint...');
  for (let i = 0; i < 40; i++) {
    try {
      const res = await axios.get(url);
      console.log('SUCCESS! Database Host:', res.data.host);
      return;
    } catch (e: any) {
      console.log(`[Attempt ${i + 1}/40] Still deploying or waiting... status code:`, e.response?.status || e.message);
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
  }
  console.log('Polling timed out.');
}

poll();
