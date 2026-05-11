import api from '../../../../services/api';

const PREFIX = '/internal/reports';

export const InternalReportsService = {
    /** Get Room Wise Seating Report for Internal Exams */
    getRoomWise: async (examDate: string, session: string, seriesId: number) => {
        const r = await api.get(`${PREFIX}/room-wise`, { params: { examDate, session, seriesId } });
        return r.data;
    },

    /** Get Consolidated Seating Report for Internal Exams */
    getConsolidated: async (examDate: string, session: string, seriesId: number) => {
        const r = await api.get(`${PREFIX}/consolidated`, { params: { examDate, session, seriesId } });
        return r.data;
    }
};
