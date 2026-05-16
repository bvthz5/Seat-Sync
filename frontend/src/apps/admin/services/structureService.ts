import { Block, Floor, Room } from "../types/collegeStructure";
import api from "../../../services/api"; // Correct path to shared api instance

const PREFIX = '/admin/college-structure';

export interface PaginatedResponse<T> {
    total: number;
    pages: number;
    currentPage: number;
    data: T[];
}

export const structureService = {
    // --- DELETE ALL STRUCTURE DATA ---
    deleteAllStructureData: async () => {
        await api.delete(`${PREFIX}/all`);
    },
    // --- BLOCKS ---
    getBlocks: async (params?: { page?: number, limit?: number, search?: string, status?: string }) => {
        const response = await api.get<PaginatedResponse<Block>>(`${PREFIX}/blocks`, { params });
        return response.data;
    },
    createBlock: async (data: Partial<Block>) => {
        const response = await api.post<Block>(`${PREFIX}/blocks`, data);
        return response.data;
    },
    updateBlock: async (id: number, data: Partial<Block>) => {
        const response = await api.put<Block>(`${PREFIX}/blocks/${id}`, data);
        return response.data;
    },
    deleteBlock: async (id: number) => {
        await api.delete(`${PREFIX}/blocks/${id}`);
    },

    // --- FLOORS ---
    getFloors: async (params?: { blockId?: number, page?: number, limit?: number, search?: string, status?: string }) => {
        const response = await api.get<PaginatedResponse<Floor>>(`${PREFIX}/floors`, { params });
        return response.data;
    },
    createFloor: async (data: Partial<Floor>) => {
        const response = await api.post<Floor>(`${PREFIX}/floors`, data);
        return response.data;
    },
    updateFloor: async (id: number, data: Partial<Floor>) => {
        const response = await api.put<Floor>(`${PREFIX}/floors/${id}`, data);
        return response.data;
    },
    deleteFloor: async (id: number) => {
        await api.delete(`${PREFIX}/floors/${id}`);
    },

    // --- ROOMS ---
    getRooms: async (params: { floorId?: number, blockId?: number, page?: number, limit?: number, search?: string, status?: string }) => {
        const response = await api.get<PaginatedResponse<Room>>(`/rooms`, { params });
        return response.data;
    },
    createRoom: async (data: Partial<Room>) => {
        const response = await api.post<Room>(`/rooms`, data);
        return response.data;
    },
    bulkCreateRooms: async (data: { blockId: number, floorId: number, rooms: { roomCode: string, TotalCapacity: number }[] }) => {
        const response = await api.post<Room[]>(`/rooms/bulk`, data);
        return response.data;
    },
    updateRoom: async (id: number, data: Partial<Room>) => {
        const response = await api.put<Room>(`/rooms/${id}`, data);
        return response.data;
    },
    // Special method for layout updates to trigger seat generation (legacy controller)
    updateRoomLayout: async (id: number, data: Partial<Room>) => {
        const response = await api.put<Room>(`${PREFIX}/rooms/${id}`, data);
        return response.data;
    },
    disableRoom: async (id: number) => {
        await api.patch(`/rooms/${id}/disable`);
    },
    enableRoom: async (id: number) => {
        await api.patch(`/rooms/${id}/enable`);
    },
    deleteRoom: async (id: number) => {
        await api.delete(`/rooms/${id}`);
    },

    // --- LAYOUT ---
    getRoomLayout: async (roomId: number) => {
        const response = await api.get<{ room: Room, seats: any[], seatCount: number }>(`${PREFIX}/rooms/${roomId}/layout`);
        return response.data;
    },

    // --- SEAT UPDATES ---
    updateSeatStates: async (roomId: number, updates: { SeatID: number, IsActive?: boolean }[]) => {
        const response = await api.put(`${PREFIX}/rooms/${roomId}/seats`, { updates });
        return response.data;
    },

    // --- IMPORT ---
    importStructure: async (file: File, previewData?: { BlockName: string, FloorNumber: string, RoomCode: string, Capacity: string, IsExamUsable: string }[]) => {
        // If pre-processed data is available, send as JSON to avoid backend re-parsing issues
        if (previewData && previewData.length > 0) {
            console.log('[DEBUG] Sending pre-processed JSON data:', { records: previewData.length });
            const response = await api.post<{ blocksCreated: number, floorsCreated: number, roomsCreated: number, roomsUpdated?: number }>(
                `/college-structure/import/json`,
                {
                    data: previewData
                }
            );
            return response.data;
        }

        // Fallback: send raw file via FormData
        const formData = new FormData();
        formData.append('file', file);

        console.log('[DEBUG] Uploading file:', { fileName: file.name, fileSize: file.size });

        const response = await api.post<{ blocksCreated: number, floorsCreated: number, roomsCreated: number, roomsUpdated?: number }>(
            `/college-structure/import/csv`,
            formData
        );
        return response.data;
    }
};

