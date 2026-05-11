import { InternalRoom } from "../../models/InternalRoom.js";
import InternalSeatLayout from "../../models/InternalSeatLayout.js";
import InternalSeatColumn from "../../models/InternalSeatColumn.js";
import { InternalSeat } from "../../models/InternalSeat.js";
import InternalBlock from "../../models/InternalBlock.js";
import InternalFloor from "../../models/InternalFloor.js";

export const internalLayoutSyncService = {
  getInternalRoomBlueprint: async (roomId: number) => {
    const room = await InternalRoom.findByPk(roomId, {
      include: [
        { model: InternalBlock },
        { model: InternalFloor },
        {
          model: InternalSeatLayout,
          include: [
            {
              model: InternalSeatColumn,
              include: [{ model: InternalSeat }]
            }
          ]
        }
      ]
    });
    if (!room) throw new Error("Room not found");
    return room; // Will format as per blueprint
  },
  
  syncInfrastructureLayout: async (roomId: number) => {
    // Sync active seats, layout columns
    console.log("Synchronizing seating blueprint for Room ID:", roomId);
  },
  
  buildInternalSeatMap: async (layoutId: number) => {
    // Generate mapped JSON 
  },
  
  refreshInternalSeatSnapshot: async (roomId: number) => {
    // Refresh the seat map cache
  },
  
  getLiveInternalLayout: async (roomId: number) => {
    return await internalLayoutSyncService.getInternalRoomBlueprint(roomId);
  }
};
