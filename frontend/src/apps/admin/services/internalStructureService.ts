/**
 * internalStructureService.ts
 *
 * ISOLATED service layer for Internal Exam College Structure.
 * Uses /api/admin/internal-structure prefix.
 * MUST NOT import from or call structureService.ts or /admin/college-structure endpoints.
 */
import api from "../../../services/api";

const PREFIX = '/admin/internal-structure';

export interface PaginatedResponse<T> {
    total: number;
    pages: number;
    currentPage: number;
    data: T[];
}

export interface InternalBlock {
    BlockID: number;
    BlockName: string;
    Status: 'Active' | 'Inactive';
    floorCount?: number;
}

export interface InternalFloor {
    FloorID: number;
    BlockID: number;
    FloorNumber: number;
    Status: 'Active' | 'Inactive';
    Block?: { BlockName: string };
}

export interface InternalRoom {
    RoomID: number;
    BlockID: number;
    FloorID: number;
    RoomCode: string;
    RoomType: "Classroom" | "Drawing Hall" | "Lab" | "Minor Room" | "Seminar Hall";
    TotalCapacity: number;
    OverrideCap?: number | null;
    RowLayout: number[];
    SeatsPerBench: number;  // 1=single, 2=dual
    SeatMode: "Dual" | "Single" | "Mixed";
    Status: 'Active' | 'Inactive';
    ExamUsable: boolean;
    Block?: { BlockName: string };
    Floor?: { FloorNumber: number };
}

export interface InternalSeat {
    SeatID: number;
    RoomID: number;
    RowLabel: string;      // "A", "B", "C"
    BenchNumber: number;   // 1, 2, 3...
    SeatNumber: number;    // 1=Left, 2=Right
    IsActive: boolean;
}

export const internalStructureService = {

    // ─── BLOCKS ───────────────────────────────────────────────────────────────
    getBlocks: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
        const res = await api.get<PaginatedResponse<InternalBlock>>(`${PREFIX}/blocks`, { params });
        return res.data;
    },
    createBlock: async (data: { BlockName: string; Status?: string }) => {
        const res = await api.post<InternalBlock>(`${PREFIX}/blocks`, data);
        return res.data;
    },
    updateBlock: async (id: number, data: { BlockName?: string; Status?: string }) => {
        const res = await api.put<InternalBlock>(`${PREFIX}/blocks/${id}`, data);
        return res.data;
    },
    deleteBlock: async (id: number) => {
        await api.delete(`${PREFIX}/blocks/${id}`);
    },

    // ─── FLOORS ───────────────────────────────────────────────────────────────
    getFloors: async (params?: { blockId?: number; page?: number; limit?: number; search?: string; status?: string }) => {
        const res = await api.get<PaginatedResponse<InternalFloor>>(`${PREFIX}/floors`, { params });
        return res.data;
    },
    createFloor: async (data: { BlockID: number; FloorNumber: number; Status?: string }) => {
        const res = await api.post<InternalFloor>(`${PREFIX}/floors`, data);
        return res.data;
    },
    updateFloor: async (id: number, data: { FloorNumber?: number; Status?: string }) => {
        const res = await api.put<InternalFloor>(`${PREFIX}/floors/${id}`, data);
        return res.data;
    },
    deleteFloor: async (id: number) => {
        await api.delete(`${PREFIX}/floors/${id}`);
    },

    // ─── ROOMS ────────────────────────────────────────────────────────────────
    getRooms: async (params?: { blockId?: number; floorId?: number; page?: number; limit?: number; search?: string; status?: string }) => {
        const res = await api.get<PaginatedResponse<InternalRoom>>(`${PREFIX}/rooms`, { params });
        return res.data;
    },
    createRoom: async (data: Partial<InternalRoom>) => {
        const res = await api.post<InternalRoom>(`${PREFIX}/rooms`, data);
        return res.data;
    },
    bulkCreateRooms: async (data: { blockId: number; floorId: number; rooms: { roomCode: string; TotalCapacity: number }[] }) => {
        const res = await api.post(`${PREFIX}/rooms/bulk`, data);
        return res.data;
    },
    updateRoom: async (id: number, data: Partial<InternalRoom>) => {
        const res = await api.put<InternalRoom>(`${PREFIX}/rooms/${id}`, data);
        return res.data;
    },
    disableRoom: async (id: number) => {
        await api.patch(`${PREFIX}/rooms/${id}/disable`);
    },
    enableRoom: async (id: number) => {
        await api.patch(`${PREFIX}/rooms/${id}/enable`);
    },
    deleteRoom: async (id: number) => {
        await api.delete(`${PREFIX}/rooms/${id}`);
    },

    // ─── LAYOUT ───────────────────────────────────────────────────────────────
    getRoomLayout: async (roomId: number) => {
        const res = await api.get<{ room: InternalRoom; seats: InternalSeat[]; seatCount: number }>(`${PREFIX}/rooms/${roomId}/layout`);
        return res.data;
    },
    updateRoomLayout: async (roomId: number, data: { RowLayout: number[]; SeatsPerBench: number }) => {
        const res = await api.put(`${PREFIX}/rooms/${roomId}/layout`, data);
        return res.data;
    },
    updateSeatStates: async (roomId: number, updates: { SeatID: number; IsActive: boolean }[]) => {
        const res = await api.put(`${PREFIX}/rooms/${roomId}/seats`, { updates });
        return res.data;
    },

    // ─── BULK ─────────────────────────────────────────────────────────────────
    importStructure: async (data: any[]) => {
        const res = await api.post(`${PREFIX}/import`, { data });
        return res.data;
    },
    getFloorsByBlock: async (blockId: number) => {
        const res = await api.get(`${PREFIX}/blocks/${blockId}/floors`);
        return res.data;
    },
    deleteAllInternalStructure: async () => {
        await api.delete(`${PREFIX}/all`);
    },
};
