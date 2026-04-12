import { Seat } from '../models/Seat.js';
import { Room } from '../models/Room.js';

export async function generateSeats(room: Room | any, transaction?: any) {
    if (!room || !room.RowLayout) return;

    const layout = room.RowLayout;
    if (!Array.isArray(layout)) return;

    // 1. Fetch all existing seats for the room
    const queryOptions: any = { where: { RoomID: room.RoomID } };
    if (transaction) queryOptions.transaction = transaction;
    const existingSeats = await Seat.findAll(queryOptions);    

    // 2. Generate expected seat structures based on precise RowLayout
    const expectedSeatKeys = new Set<string>();
    const expectedSeats: any[] = [];

    const seatsPerBench = room.SeatsPerBench || 2;

    // Excel maps exactly to:
    // rowIndex = row index
    // benches = RowLayout[rowIndex]
    for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
        const benches = layout[rowIndex] || 0;
        // If benches == 0 → skip
        if (benches === 0) continue;

        // For benchIndex:
        for (let benchIndex = 1; benchIndex <= benches; benchIndex++) {
            // For seatIndex:
            for (let seatIndex = 1; seatIndex <= seatsPerBench; seatIndex++) {
                const key = `${rowIndex}-${benchIndex}-${seatIndex}`;
                expectedSeatKeys.add(key);
                expectedSeats.push({
                    RoomID: room.RoomID,
                    RowIndex: rowIndex,
                    BenchIndex: benchIndex,
                    SeatIndex: seatIndex,
                    IsActive: true,
                    ZoneID: null // default null
                });
            }
        }
    }

    // 3. Diff old vs new explicitly
    const seatIdsToRemove: number[] = [];
    const existingSeatKeys = new Set<string>();

    for (const seat of existingSeats) {
        // Assume seat has RowIndex, BenchIndex, SeatIndex as attributes
        const key = `${seat.RowIndex}-${seat.BenchIndex}-${seat.SeatIndex}`;
        existingSeatKeys.add(key);

        // If seat no longer exists physically in the new layout
        if (!expectedSeatKeys.has(key)) {
            seatIdsToRemove.push(seat.SeatID);
        }
    }

    const seatsToAdd = expectedSeats.filter(
        (seat) => !existingSeatKeys.has(`${seat.RowIndex}-${seat.BenchIndex}-${seat.SeatIndex}`)
    );

    // 4. Update Database safely ensuring we only add or remove the diff
    if (seatIdsToRemove.length > 0) {
        const destroyOptions: any = { where: { SeatID: seatIdsToRemove } };
        if (transaction) destroyOptions.transaction = transaction;
        await Seat.destroy(destroyOptions);
    }

    if (seatsToAdd.length > 0) {
        const bulkCreateOptions: any = {};
        if (transaction) bulkCreateOptions.transaction = transaction;
        await Seat.bulkCreate(seatsToAdd, bulkCreateOptions);
    }
}
