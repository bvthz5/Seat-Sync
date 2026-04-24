import { sequelize } from './dist/config/database.js';
import { generateSeats } from './dist/services/seatEngine.js';
import { Room } from './dist/models/Room.js';

async function run() {
  try {
    await sequelize.authenticate();
    const rooms = await Room.findAll();
    console.log(`Found ${rooms.length} rooms. Generating seats...`);
    let generated = 0;
    for (const room of rooms) {
        try {
            await generateSeats(room);
            generated++;
        } catch(e) {
            console.error(`Error regenerating for room ${room.RoomID}:`, e.message);
        }
    }
    console.log(`Successfully generated seats for ${generated} rooms.`);
  } catch (err) {
    console.error("Bulk Seed Error:", err.message);
  } finally {
    process.exit(0);
  }
}
run();
