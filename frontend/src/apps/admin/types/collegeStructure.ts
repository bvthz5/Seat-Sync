export interface Block {
    BlockID: number;
    BlockName: string;
    Status: 'Active' | 'Inactive';
    floorCount?: number;
    roomCount?: number;
}

export interface Floor {
    FloorID: number;
    BlockID: number;
    FloorNumber: number;
    Status: 'Active' | 'Inactive';
    roomsCount?: number;
    Block?: Block;
}

export interface Room {
    RoomID: number;
    BlockID: number;
    FloorID: number;
    RoomCode: string; // New: replaces RoomName
    RoomName?: string; // Legacy support (optional)
    Capacity: number; // New
    TotalRows: number;
    BenchesPerRow: number;
    SeatsPerBench: number;
    Status: 'Active' | 'Inactive';
    ExamUsable: boolean;
    Floor?: Floor;
}

// Stats interface for layout visualization
export interface LayoutStats {
    totalSeats: number;
}
