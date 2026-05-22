import https from 'https';

console.log("Starting backend route polling...");

function check() {
  https.get('https://rabbit-backend-p765.onrender.com/api/leaves/me', (res) => {
    console.log(`[${new Date().toISOString()}] Status Code: ${res.statusCode}`);
    if (res.statusCode !== 404) {
      console.log("Success! The new build is live!");
      process.exit(0);
    }
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

setInterval(check, 15000);
check();
