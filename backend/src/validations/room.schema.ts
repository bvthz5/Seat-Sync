export interface CreateRoomSchema {
    roomCode: string;
    blockId: number;
    floorId: number;
    capacity: number;
    isExamUsable: boolean;
}

export interface BulkCreateRoomSchema {
    blockId: number;
    floorId: number;
    rooms: {
        roomCode: string;
        capacity: number;
    }[];
}

export interface UpdateRoomSchema {
    roomCode?: string;
    capacity?: number;
    isExamUsable?: boolean;
    // Add other updateable fields
}
