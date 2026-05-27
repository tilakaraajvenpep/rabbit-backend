import { sendEmail } from '../src/utils/email.js';

async function testDirectEmail() {
  try {
    console.log('Sending direct test email...');
    await sendEmail({
      to: 'tilak@venpep.com',
      subject: 'Direct Test Email',
      html: '<p>This is a direct test email from the Rabbit platform.</p>'
    });
    console.log('Direct email sent successfully!');
  } catch (err: any) {
    console.error('Direct email failed:', err.message);
    console.error(err);
  }
  process.exit(0);
}

testDirectEmail();
