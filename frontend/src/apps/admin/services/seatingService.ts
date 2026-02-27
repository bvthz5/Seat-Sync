import api from '../../../services/api';

const PREFIX = '/seating';

export const SeatingService = {
    /** Get all exams for the seating page dropdown */
    getExams: async () => {
        const res = await api.get(`${PREFIX}/exams`);
        return res.data;
    },

    /** Get all active halls/rooms */
    getHalls: async () => {
        const res = await api.get(`${PREFIX}/halls`);
        return res.data;
    },

    /** Get seat layout grid for a hall */
    getHallLayout: async (hallId: number) => {
        const res = await api.get(`${PREFIX}/halls/${hallId}/layout`);
        return res.data;
    },

    /** Get all departments with student counts */
    getDepartments: async () => {
        const res = await api.get(`${PREFIX}/departments`);
        return res.data;
    },

    /** Get students for a specific department */
    getStudentsByDept: async (deptId: number) => {
        const res = await api.get(`${PREFIX}/students/${deptId}`);
        return res.data;
    },

    /** Auto-assign students to a hall based on left/right dept selection */
    autoAssign: async (payload: {
        examId: number;
        hallId: number;
        leftDeptId?: number | null;
        rightDeptId?: number | null;
    }) => {
        const res = await api.post(`${PREFIX}/auto-assign`, payload);
        return res.data;
    },

    /** Save the current hall allocation to the database */
    saveAllocation: async (payload: {
        examId: number;
        hallId: number;
        assignments: { seatId: number; studentId: number }[];
    }) => {
        const res = await api.post(`${PREFIX}/save`, payload);
        return res.data;
    },

    /** Fetch saved allocation for a specific exam + hall */
    getAllocationForHall: async (examId: number, hallId: number) => {
        const res = await api.get(`${PREFIX}/${examId}/${hallId}`);
        return res.data;
    },

    /** Clear all allocations for a hall for a given exam */
    clearAllocation: async (examId: number, hallId: number) => {
        const res = await api.delete(`${PREFIX}/${examId}/${hallId}`);
        return res.data;
    },
};
