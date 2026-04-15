import { Room } from "./models/Room.js";
import { Seat } from "./models/Seat.js";
import { Zone } from "./models/Zone.js";

async function testLayout() {
    try {
        await Room.findByPk(1);
        await Seat.findAll({ attributes: ['SeatID', 'RoomID', 'RowIndex', 'BenchIndex', 'SeatIndex', 'IsActive', 'ZoneID'] });
        await Zone.findAll();
        console.log('ALL OK');
    } catch(e) {
        console.error('CRASH:', (e as any).message);
    }
    process.exit(0);
}
testLayout();
