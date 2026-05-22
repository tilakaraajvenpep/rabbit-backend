import https from 'https';

console.log("Polling for diagnostic endpoint update...");

function check() {
  https.get('https://rabbit-backend-p765.onrender.com/health/db-columns', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.ticketRows) {
          console.log("Success! The new diagnostic code is live!");
          console.log(JSON.stringify(parsed.ticketRows, null, 2));
          process.exit(0);
        } else {
          console.log(`[${new Date().toISOString()}] Diagnostic not live yet (Status: ${res.statusCode})`);
        }
      } catch (e) {
        console.log(`[${new Date().toISOString()}] Parsing failed.`);
      }
    });
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

setInterval(check, 10000);
check();
