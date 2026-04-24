import { sequelize } from './dist/config/database.js';

async function run() {
  try {
    await sequelize.authenticate();
    
    console.log("Adding IsEligible...");
    try {
        await sequelize.query('ALTER TABLE SeatAllocations ADD IsEligible BIT DEFAULT 1');
    } catch(e) { console.error("IsEligible error:", e.message) }

    console.log("Adding IsBlocked...");
    try {
        await sequelize.query('ALTER TABLE SeatAllocations ADD IsBlocked BIT DEFAULT 0');
    } catch(e) { console.error("IsBlocked error:", e.message) }

    console.log("Done adding columns.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
