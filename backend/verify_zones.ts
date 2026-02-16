import { sequelize } from './src/config/database.js';
import { Seat } from './src/models/Seat.js';
import { Zone } from './src/models/Zone.js';
import { Room } from './src/models/Room.js';
import { Op } from 'sequelize';

async function verifyZones() {
    try {
        // List all rooms
        const rooms = await Room.findAll();
        console.log('\n📍 Available Rooms:');
        rooms.forEach(room => {
            console.log(`  - Room ${room.RoomID}: ${room.RoomCode}`);
        });

        // Check a room with ID (you can change this based on what you see in screenshot)
        // From the screenshot, seems like LH-1/3 or similar
        const roomWithZones = await Room.findOne({
            where: { RoomCode: 'LH-123' } // Adjust based on actual data
        });

        if (roomWithZones) {
            console.log(`\n🔍 Checking Room: ${roomWithZones.RoomCode} (ID: ${roomWithZones.RoomID})`);

            // Get zones for this room
            const zones = await Zone.findAll({
                where: { RoomID: roomWithZones.RoomID }
            });

            console.log(`\n🎨 Zones in this room (${zones.length}):`);
            zones.forEach(zone => {
                console.log(`  - Zone ${zone.ZoneID}: "${zone.ZoneName}" (${zone.ZoneCode}) - Color: ${zone.Color}`);
            });

            // Get ALL seats with zone assignments
            const seatsWithZones = await Seat.findAll({
                where: {
                    RoomID: roomWithZones.RoomID,
                    ZoneID: { [Op.ne]: null }
                },
                order: [['RowLabel', 'ASC'], ['BenchNumber', 'ASC'], ['SeatNumber', 'ASC']]
            });

            console.log(`\n💺 Seats with Zone Assignments (${seatsWithZones.length}):`);

            if (seatsWithZones.length > 0) {
                const zoneGroups = new Map<number, any[]>();

                seatsWithZones.forEach(seat => {
                    const zoneId = seat.ZoneID!;
                    if (!zoneGroups.has(zoneId)) {
                        zoneGroups.set(zoneId, []);
                    }
                    zoneGroups.get(zoneId)!.push(seat);
                });

                zoneGroups.forEach((seats, zoneId) => {
                    const zone = zones.find(z => z.ZoneID === zoneId);
                    console.log(`\n  🎨 Zone ${zoneId} - "${zone?.ZoneName}" (${zone?.ZoneCode}): ${seats.length} seats`);
                    seats.slice(0, 5).forEach(seat => {
                        const seatIdGenerated = `${seat.RowLabel.trim()}-${seat.BenchNumber}-${seat.SeatNumber}`;
                        console.log(`    - Seat ${seat.SeatID}: Row="${seat.RowLabel}" Bench=${seat.BenchNumber} Num=${seat.SeatNumber} → ID="${seatIdGenerated}"`);
                    });
                    if (seats.length > 5) {
                        console.log(`    ... and ${seats.length - 5} more seats`);
                    }
                });
            } else {
                console.log('  ❌ No seats have zone assignments!');
            }

            // Check for any data issues
            console.log('\n🔧 Data Quality Check:');
            const allSeats = await Seat.findAll({ where: { RoomID: roomWithZones.RoomID } });
            const totalSeats = allSeats.length;
            const seatsWithZonesCount = seatsWithZones.length;
            const seatsWithoutZones = totalSeats - seatsWithZonesCount;

            console.log(`  - Total Seats: ${totalSeats}`);
            console.log(`  - Seats with Zones: ${seatsWithZonesCount}`);
            console.log(`  - Seats without Zones: ${seatsWithoutZones}`);

            // Check specific seat IDs to verify format
            console.log('\n📋 Sample Seat Data (first 10):');
            allSeats.slice(0, 10).forEach(seat => {
                const seatId = `${seat.RowLabel.trim()}-${seat.BenchNumber}-${seat.SeatNumber}`;
                console.log(`  - Seat ${seat.SeatID}: RowLabel="${seat.RowLabel}" (len=${seat.RowLabel.length}, trimmed: "${seat.RowLabel.trim()}"), Bench=${seat.BenchNumber}, Num=${seat.SeatNumber}, ZoneID=${seat.ZoneID || 'null'} → GeneratedID="${seatId}"`);
            });
        } else {
            console.log('\n❌ Room not found. Here are some available rooms:');
            const someRooms = await Room.findAll({ limit: 10 });
            someRooms.forEach(r => console.log(`  - ${r.RoomCode} (ID: ${r.RoomID})`));
        }

        await sequelize.close();
    } catch (error) {
        console.error('Error:', error);
        await sequelize.close();
    }
}

verifyZones();
