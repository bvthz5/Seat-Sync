
const { Attendance } = require('./backend/src/models/Attendance.ts');
const { sequelize } = require('./backend/src/config/database.ts');

async function check() {
  try {
    await Attendance.sync();
    console.log("Attendance table synced successfully");
    const attrs = Attendance.rawAttributes;
    console.log("Attributes:", Object.keys(attrs));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

check();
