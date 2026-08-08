import api from "../../../services/api";

export const DashboardService = {
  getSummary: async (seriesId?: number) => {
    const res = await api.get(`/dashboard/summary`, { params: { seriesId } });
    return res.data;
  },
  getRooms: async (type?: 'internal' | 'endsem') => {
    const res = await api.get(`/dashboard/rooms`, { params: { type } });
    return res.data;
  },
  getLiveExams: async () => {
    const res = await api.get(`/dashboard/live-exams`);
    return res.data;
  },
  getDepartmentStats: async () => {
    const res = await api.get(`/dashboard/departments`);
    return res.data;
  },
  getReports: async (seriesId: string) => {
    const res = await api.get(`/dashboard/reports`, { params: { seriesId } });
    return res.data;
  },
  getActiveSessionIntelligence: async () => {
    const res = await api.get(`/dashboard/session-intelligence`);
    return res.data;
  }
};
