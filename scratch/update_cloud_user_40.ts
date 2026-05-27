import pg from 'postgres';

async function updateAndQuery() {
  const url = 'postgresql://rabbit_postgres_user:w29z9i0q2yysmgpAZyWggw40h9OM3JXj@dpg-d859t0egvqtc73blql40-a.singapore-postgres.render.com/rabbit_postgres';
  const sql = pg(url, { ssl: 'require' });
  try {
    console.log('1. Querying user 40 before update...');
    const before = await sql`SELECT user_id, full_name, email, role, team_lead_id, is_deleted FROM users WHERE user_id = 40`;
    console.log('Before:', before);

    console.log('2. Updating team_lead_id of user 40 to null...');
    const updateResult = await sql`UPDATE users SET team_lead_id = null, updated_at = NOW() WHERE user_id = 40 RETURNING user_id, team_lead_id`;
    console.log('Update Result:', updateResult);

    console.log('3. Querying user 40 after update...');
    const after = await sql`SELECT user_id, full_name, email, role, team_lead_id, is_deleted FROM users WHERE user_id = 40`;
    console.log('After:', after);
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await sql.end();
  }
}

updateAndQuery();
