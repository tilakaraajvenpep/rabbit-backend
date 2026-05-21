import axios from 'axios';

async function test() {
  try {
    const res = await axios.put('https://rabbit-backend-p765.onrender.com/api/users/20/allocated-hours', {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log("Success status:", res.status);
  } catch (err) {
    console.log("Error status:", err.response?.status);
    console.log("Error data:", err.response?.data);
  }
}

test();
