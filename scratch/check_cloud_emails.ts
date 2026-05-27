import pg from 'postgres';

async function check() {
  const url = 'postgresql://rabbit_postgres_user:w29z9i0q2yysmgpAZyWggw40h9OM3JXj@dpg-d859t0egvqtc73blql40-a.singapore-postgres.render.com/rabbit_postgres';
  const sql = pg(url, { ssl: 'require' });
  try {
    console.log('Querying cloud database users...');
    const dbUsers = await sql`SELECT user_id, tenant_id, full_name, email, role, team_lead_id, is_deleted FROM users`;
    console.log(`Total users found in cloud DB: ${dbUsers.length}`);
    dbUsers.forEach(u => {
      console.log(`- [ID: ${u.user_id}] Name: ${u.full_name} | Email: ${u.email} | Role: ${u.role} | TenantID: ${u.tenant_id} | TeamLeadID: ${u.team_lead_id} | isDeleted: ${u.is_deleted}`);
    });
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await sql.end();
  }
}

check();
