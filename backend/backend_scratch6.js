import { sequelize } from './dist/config/database.js';
import { generateSeats } from './dist/services/seatEngine.js';
import { Room } from './dist/models/Room.js';

async function run() {
  try {
    await sequelize.authenticate();
    const room = await Room.findOne({ where: { RoomID: 260 } }); // Pick one room from the user's list
    if (room) {
        console.log("Generating seats for room 260...");
        await generateSeats(room);
        console.log("Success.");
    } else {
        console.log("Room 260 not found.");
    }
  } catch (err) {
    console.error("Seat Generation Error:", err.message);
    if(err.original) console.error(err.original);
  } finally {
    process.exit(0);
  }
}
run();
