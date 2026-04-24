import { sequelize } from './dist/config/database.js';

async function run() {
  try {
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SeatAllocations' OR TABLE_NAME = 'SeatAllocation'
    `);
    console.log("DB COLUMNS: ", JSON.stringify(results, null, 2));

    await sequelize.authenticate();
    const { SeatAllocation } = await import('./dist/models/SeatAllocation.js');
    const { Seat } = await import('./dist/models/Seat.js');

    // Run the breaking query to catch the exact tedious error
    await SeatAllocation.findAll({
        where: {
            ExamID: [2092, 2093, 2094, 2095]
        },
        include: [{
            model: Seat,
            attributes: ['SeatID', 'RoomID']
        }]
    });
    
    console.log("Query Successful.");
  } catch (err) {
    if (err.original && err.original.errors) {
       err.original.errors.forEach((e, i) => console.error(`Exact Error ${i}:`, e.message));
    } else {
       console.error("Error:", err.message);
    }
  } finally {
    process.exit(0);
  }
}
run();
