import bcrypt from 'bcryptjs';

async function testPassword() {
  const hash = '$2a$10$cscYzL3UCXN7Bdg/50yAQesHgYSB/DZvea1eNIfJ2RlgN.UBKjAEW';
  const passwords = ['rabbit123', 'Tilak123', 'tilak123', 'admin123', 'password', 'tilak@venpep.com'];
  
  console.log(`Checking hash: ${hash}`);
  for (const pw of passwords) {
    const isMatch = await bcrypt.compare(pw, hash);
    console.log(`- Password "${pw}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
  }
}

testPassword();
