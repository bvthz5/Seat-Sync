import { Block, Floor, Room } from "../types/collegeStructure";
import api from "../../../services/api"; // Correct path to shared api instance

const PREFIX = '/admin/college-structure';

export const structureService = {
    // --- BLOCKS ---
    getBlocks: async () => {
        const response = await api.get<Block[]>(`${PREFIX}/blocks`);
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
    getFloors: async (blockId?: number) => {
        // Query param blockId optional
        const response = await api.get<Floor[]>(`${PREFIX}/floors`, { params: { blockId } });
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
    // --- ROOMS ---
    getRooms: async (floorId?: number, blockId?: number) => {
        // Updated to new endpoint /api/rooms
        const response = await api.get<Room[]>(`/rooms`, { params: { floorId, blockId } });
        return response.data;
    },
    createRoom: async (data: Partial<Room>) => {
        const response = await api.post<Room>(`/rooms`, data);
        return response.data;
    },
    bulkCreateRooms: async (data: { blockId: number, floorId: number, rooms: { roomCode: string, capacity: number }[] }) => {
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
    deleteRoom: async (id: number) => {
        // Using disable instead of delete as per new requirement, 
        // OR keeping delete if backend supports it. New backend doesn't implement DELETE.
        // I will map delete to disable for safety or assume delete is not supported.
        // Actually, let's keep it calling the OLD delete endpoint if strictly needed, 
        // OR warn. But since I'm implementing the prompt which says "Actions (Edit / Disable)",
        // I should probably remove Delete from UI.
        // For service completeness, I'll map it to disable or leave it throwing 404 if I removed the route.
        // The old route /admin/college-structure/rooms/:id DELETE might still work if I kept the file.
        // I'll leave it as is pointing to OLD prefix for physical delete if needed, or update to disable.
        // I'll point it to disable.
        await api.patch(`/rooms/${id}/disable`);
    },

    // --- LAYOUT ---
    getRoomLayout: async (roomId: number) => {
        const response = await api.get<{ room: Room, seats: any[], seatCount: number }>(`${PREFIX}/rooms/${roomId}/layout`);
        return response.data;
    },

    // --- IMPORT ---
    importStructure: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ blocksCreated: number, floorsCreated: number, roomsCreated: number }>(`/college-structure/import/csv`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

