import { InternalSeat } from "../../models/InternalSeat.js";
import InternalSeatAllocation from "../../models/InternalSeatAllocation.js";
import InternalRoom from "../../models/InternalRoom.js";

export const internalSeatingEngine = {
  allocateSeats: async (examId: number, students: any[]) => {
    // 1. Get live internal layout
    // 2. Filter ONLY active seats (IsActive = true)
    // 3. Skip DISABLED
    // 4. Implement Left/Right mapping and Shuffle
  }
};
