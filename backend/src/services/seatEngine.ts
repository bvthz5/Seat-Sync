import { Seat } from '../models/Seat.js';
import { Room } from '../models/Room.js';

export async function generateSeats(room: Room | any, transaction?: any) {
    if (!room || !room.RowLayout) return;

    let layout = room.RowLayout;
    if (typeof layout === 'string') {
        try { layout = JSON.parse(layout); } catch { layout = []; }
    }
    if (!Array.isArray(layout)) return;

    // 1. Fetch all existing seats for the room
    const queryOptions: any = { where: { RoomID: room.RoomID } };
    if (transaction) queryOptions.transaction = transaction;
    const existingSeats = await Seat.findAll(queryOptions);    

    // 2. Generate expected seat structures based on precise RowLayout
    const expectedSeatKeys = new Set<string>();
    const expectedSeats: any[] = [];
    const expectedSeatMap = new Map<string, { IsActive: boolean }>();

    const seatsPerBench = 2; // Enforce rule: always 2
    let seatSerial = 0;

    // Excel maps exactly to:
    // rowIndex = row index
    // benches = RowLayout[rowIndex]
    for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
        const benches = layout[rowIndex] || 0;
        // If benches == 0 â†’ skip
        if (benches === 0) continue;
        const rowLabel = String.fromCharCode(65 + rowIndex);

        // For benchIndex:
        for (let benchIndex = 1; benchIndex <= benches; benchIndex++) {
            // For seatIndex:
            for (let seatIndex = 1; seatIndex <= seatsPerBench; seatIndex++) {  
                seatSerial++;
                const isActive = true;
                const key = `${rowLabel}-${benchIndex}-${seatIndex}`;
                expectedSeatKeys.add(key);
                expectedSeatMap.set(key, { IsActive: isActive });
                expectedSeats.push({
                    RoomID: room.RoomID,
                    RowIndex: rowLabel,
                    BenchIndex: benchIndex,
                    SeatIndex: seatIndex,
                    IsActive: isActive,
                    ZoneID: null // default null
                });
            }
        }
    }

    // 3. Diff old vs new explicitly
    const seatIdsToRemove: number[] = [];
    const existingSeatKeys = new Set<string>();
    const seatsToUpdateActiveState: Array<{ seat: any; isActive: boolean }> = [];

    for (const seat of existingSeats) {
        // Assume seat has RowIndex, BenchIndex, SeatIndex as attributes
        const key = `${seat.RowIndex}-${seat.BenchIndex}-${seat.SeatIndex}`;
        existingSeatKeys.add(key);

        // If seat no longer exists physically in the new layout
        if (!expectedSeatKeys.has(key)) {
            seatIdsToRemove.push(seat.SeatID);
        } else {
            const expected = expectedSeatMap.get(key);
            if (expected && Boolean(seat.IsActive) !== expected.IsActive) {
                seatsToUpdateActiveState.push({ seat, isActive: expected.IsActive });
            }
        }
    }

    const seatsToAdd = expectedSeats.filter(
        (seat) => !existingSeatKeys.has(`${seat.RowIndex}-${seat.BenchIndex}-${seat.SeatIndex}`)
    );

    // 4. Update Database safely ensuring we only add or remove the diff
    if (seatIdsToRemove.length > 0) {
        // Instead of deleting, mark as inactive to preserve referential integrity
        const updateOptions: any = { where: { SeatID: seatIdsToRemove } };
        if (transaction) updateOptions.transaction = transaction;
        await Seat.update({ IsActive: false }, updateOptions);
    }

    if (seatsToUpdateActiveState.length > 0) {
        for (const item of seatsToUpdateActiveState) {
            const updateOptions: any = {};
            if (transaction) updateOptions.transaction = transaction;
            await item.seat.update({ IsActive: item.isActive }, updateOptions);
        }
    }

    if (seatsToAdd.length > 0) {
        const bulkCreateOptions: any = {};
        if (transaction) bulkCreateOptions.transaction = transaction;
        await Seat.bulkCreate(seatsToAdd, bulkCreateOptions);
    }
}
