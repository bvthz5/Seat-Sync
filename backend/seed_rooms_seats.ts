// Seeder for Rooms and Seats
// Run with: npx tsx backend/seed_rooms_seats.ts

import { sequelize } from './src/config/database.js';
import { Room } from './src/models/Room.js';
import { Seat } from './src/models/Seat.js';

async function seedRoomsAndSeats() {
  await sequelize.authenticate();

  // Example: Create 2 rooms
  const rooms = await Room.bulkCreate([
    { RoomID: 1, RoomCode: 'A101', Capacity: 30, IsActive: true },
    { RoomID: 2, RoomCode: 'A102', Capacity: 30, IsActive: true },
  ], { ignoreDuplicates: true });

  // Example: Create 30 seats per room
  const seats = [];
  for (const room of rooms) {
    for (let i = 1; i <= 30; i++) {
      seats.push({
        RoomID: room.RoomID,
        RowLabel: 'R' + Math.ceil(i / 6),
        BenchNumber: Math.ceil(i / 6),
        SeatNumber: i,
        IsActive: true,
      });
    }
  }
  await Seat.bulkCreate(seats, { ignoreDuplicates: true });

  console.log('Rooms and seats seeded.');
  await sequelize.close();
}

seedRoomsAndSeats().catch(e => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
