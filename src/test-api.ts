import axios from 'axios';

async function testApi() {
  try {
    // We need a token. I'll just check the DB directly again but with a focus on project 3.
    const response = await axios.get('http://localhost:5000/projects/3/documents', {
       headers: {
         'Authorization': 'Bearer <REDACTED>', // I don't have a token here easily
       }
    });
  } catch (e) {}
}
