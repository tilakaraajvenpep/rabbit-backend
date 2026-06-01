import { db, reconcileAlertsData } from '../src/db/index.js';
import { alerts } from '../src/db/schema/index.js';

async function main() {
  console.log("Running reconciliation...");
  await reconcileAlertsData();
  
  const allAlerts = await db.select().from(alerts);
  console.log("ALERTS AFTER RECONCILIATION:");
  console.log(JSON.stringify(allAlerts, null, 2));
  process.exit(0);
}

main();
