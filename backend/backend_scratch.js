import { sequelize } from './dist/config/database.js';
import { Seat } from './dist/models/Seat.js';

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected");
    await Seat.findAll({
        where: { RoomID: 261 },
        order: [
            ['RowIndex', 'ASC'],
            ['BenchIndex', 'ASC'],
            ['SeatIndex', 'ASC']
        ]
    });
    console.log("Success");
  } catch (err) {
    if (err.original && err.original.errors) {
       err.original.errors.forEach((e, i) => console.error(`Error ${i}:`, e.message));
    } else {
       console.error("Error:", err.message);
    }
  } finally {
    process.exit(0);
  }
}
run();
