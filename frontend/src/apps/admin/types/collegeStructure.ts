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
    TotalCapacity: number; // New
    OverrideCap?: number | null; // Optional override cap
    TotalRows: number;
    BenchesPerRow: number;
    SeatsPerBench: number;
    Status: 'Active' | 'Inactive';
    ExamUsable: boolean;
    RoomType: 'ROOM' | 'HALL';
    BenchMode?: 'PAIRED' | 'ALTERNATING';
    IsLayoutLocked?: boolean;
    Floor?: Floor;
    Block?: Block;
}

// Stats interface for layout visualization
export interface LayoutStats {
    totalSeats: number;
}

export interface Zone {
    ZoneID: number;
    RoomID: number;
    ZoneCode: string;
    ZoneName: string;
    Color: string;
}
