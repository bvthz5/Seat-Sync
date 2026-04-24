import { sequelize } from './dist/config/database.js';

async function run() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT TOP 10 SeatID, RoomID, RowLabel, BenchNumber, SeatNumber, IsActive
      FROM Seats
    `);
    console.log("Seats found in DB: ", JSON.stringify(results, null, 2));

    const [counts] = await sequelize.query(`
      SELECT RoomID, count(*) as count, IsActive
      FROM Seats
      GROUP BY RoomID, IsActive
    `);
    console.log("Summary of seats: ", JSON.stringify(counts, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
