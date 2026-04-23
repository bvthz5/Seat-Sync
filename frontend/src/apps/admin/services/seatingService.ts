import api from '../../../services/api';

const PREFIX = '/seating';

export const SeatingService = {
    /** Get all exam series */
    getSeries: async () => { const r = await api.get(`${PREFIX}/series`); return r.data; },

    /** Get distinct exam dates (optionally by seriesId) */
    getExamDates: async (seriesId?: number) => {
        const r = await api.get(`${PREFIX}/exam-dates`, { params: seriesId ? { seriesId } : {} });
        return r.data;
    },

    /** Get all active halls */
    getHalls: async () => { const r = await api.get(`${PREFIX}/halls`); return r.data; },

    /** Get seat layout for a hall */
    getHallLayout: async (hallId: number) => { const r = await api.get(`${PREFIX}/halls/${hallId}/layout`); return r.data; },

    /** Get departments with student counts */
    getDepartments: async () => { const r = await api.get(`${PREFIX}/departments`); return r.data; },

    /** Get departments participating on selected day (all sessions) with student totals */
    getExamDepartments: async (examDate: string, _session: string, seriesId?: number) => {
        const params: Record<string, string | number> = { examDate };
        if (seriesId) params.seriesId = seriesId;
        const r = await api.get(`${PREFIX}/exam-departments`, { params });
        return r.data;
    },

    /** Get students by department */
    getStudentsByDept: async (deptId: number) => { const r = await api.get(`${PREFIX}/students/${deptId}`); return r.data; },

    /** Per-hall allocation summary for a date+session */
    getAllocationSummary: async (examDate: string, session: string) => {
        const r = await api.get(`${PREFIX}/allocation-summary/${examDate}/${session}`);
        return r.data;
    },

    /** Auto-assign students to a single hall */
    autoAssign: async (payload: { examDate: string; session: string; hallId: number; leftDeptId?: number | null; rightDeptId?: number | null; seriesId?: number }) => {
        const r = await api.post(`${PREFIX}/auto-assign`, payload);
        return r.data;
    },

    /** Bulk-assign students across multiple halls */
    bulkAssign: async (payload: {
        examDate: string;
        session: string;
        hallIds: number[];
        seriesId?: number;
        mode?: 'single' | 'two-alternate' | 'auto-balanced';
        primaryDeptId?: number | null;
        secondaryDeptId?: number | null;
        avoidSameDeptBench?: boolean;
        shuffleRooms?: boolean;
        roomCapacityLimit?: number;   // End Sem: per-room seat cap (default 40)
        leftDeptId?: number | null; // backward compatibility
        rightDeptId?: number | null; // backward compatibility
    }) => {
        const r = await api.post(`${PREFIX}/bulk-assign`, payload);
        return r.data;
    },

    /** Physically shuffle all presently seated students across all halls for a given session */
    shuffleGlobal: async (payload: { examDate: string; session: string }) => {
        const r = await api.post(`${PREFIX}/shuffle-global`, payload);
        return r.data;
    },

    /** Save allocation for a hall */
    saveAllocation: async (payload: { examDate: string; session: string; hallId: number; assignments: { seatId: number; studentId: number }[] }) => {
        const r = await api.post(`${PREFIX}/save`, payload);
        return r.data;
    },

    /** Get saved allocation for a date+session+hall */
    getAllocationForHall: async (examDate: string, session: string, hallId: number) => {
        const r = await api.get(`${PREFIX}/allocation/${examDate}/${session}/${hallId}`);
        return r.data;
    },

    /** Clear allocation for a hall */
    clearAllocation: async (examDate: string, session: string, hallId: number) => {
        const r = await api.delete(`${PREFIX}/allocation/${examDate}/${session}/${hallId}`);
        return r.data;
    },

    /** Clear ALL allocations for an entire date + session (nuclear wipe) */
    clearAllAllocations: async (examDate: string, session: string) => {
        const r = await api.delete(`${PREFIX}/allocation/${examDate}/${session}`);
        return r.data;
    },

    /** Quick add a seating slot (placeholder exam) */
    quickAddSlot: async (payload: { examDate: string; session: string; seriesId?: number }) => {
        const r = await api.post(`${PREFIX}/quick-add-slot`, payload);
        return r.data;
    },

    /** Import seating from Excel */
    importSeatingExcel: async (payload: { examDate: string; session: string; hallIds?: number[]; rows: any[] }) => {
        const r = await api.post(`${PREFIX}/import-excel`, payload);
        return r.data;
    },

    /** Search student by register number or name within a slot */
    searchStudent: async (examDate: string, session: string, q: string) => {
        const r = await api.get(`${PREFIX}/search-student`, { params: { examDate, session, q } });
        return r.data as { results: { studentId: number; registerNumber: string; name: string; allocated: boolean; hallCode: string | null; hallId: number | null; rowLabel: string | null; benchNumber: number | null; side: string | null; seatLabel: string | null }[] };
    },

    /** Export seating arrangement to Excel */
    exportSeating: async (examDate: string, session: string) => {
        const r = await api.get(`${PREFIX}/export`, {
            params: { examDate, session },
            responseType: 'blob'
        });
        return r.data;
    },
};
