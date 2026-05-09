import api from '../../../../services/api';

const PREFIX = '/internal/seating';

export const InternalSeatingService = {
    /** Get all active halls for internal exams */
    getHalls: async () => {
        const r = await api.get(`${PREFIX}/halls`);
        return r.data;
    },

    /** Get distinct exam dates for internal series */
    getExamDates: async (seriesId?: number, session?: string) => {
        const r = await api.get(`${PREFIX}/exam-dates`, { params: { seriesId, session } });
        return r.data;
    },

    /** Get exams for a specific date and session */
    getExams: async (examDate: string, session: string, seriesId: number) => {
        const r = await api.get(`${PREFIX}/exams`, { params: { examDate, session, seriesId } });
        return r.data;
    },

    /** Get hall layout with current allocations */
    getHallLayout: async (hallId: number, examDate: string, session: string, seriesId: number) => {
        const r = await api.get(`${PREFIX}/halls/${hallId}/layout`, { params: { examDate, session, seriesId } });
        return r.data;
    },

    /** Get global allocation summary for a slot */
    getSummary: async (examDate: string, session: string, seriesId: number) => {
        const r = await api.get(`${PREFIX}/summary`, { params: { examDate, session, seriesId } });
        return r.data;
    },

    /** Generate allocations using the engine */
    generate: async (payload: {
        examDate: string;
        session: string;
        hallIds: number[];
        mode: string;
        seriesId: number;
        primaryDeptId?: number;
        secondaryDeptId?: number;
        shuffleRooms?: boolean;
    }) => {
        const r = await api.post(`${PREFIX}/generate`, payload);
        return r.data;
    },

    /** Save manual allocation changes */
    save: async (payload: {
        examDate: string;
        session: string;
        hallId: number;
        seriesId: number;
        assignments: { seatId: number; studentId: number; examId: number }[];
    }) => {
        const r = await api.post(`${PREFIX}/save`, payload);
        return r.data;
    },

    /** Clear allocations for a hall */
    clear: async (examDate: string, session: string, hallId: number, seriesId: number) => {
        const r = await api.delete(`${PREFIX}/allocation/${examDate}/${session}/${hallId}`, { params: { seriesId } });
        return r.data;
    }
};
