import api from "../../../services/api";

export const DashboardService = {
  getSummary: async (seriesId?: number) => {
    const res = await api.get(`/dashboard/summary`, { params: { seriesId } });
    return res.data;
  },
  getRooms: async () => {
    const res = await api.get(`/dashboard/rooms`);
    return res.data;
  },
  getLiveExams: async () => {
    const res = await api.get(`/dashboard/live-exams`);
    return res.data;
  },
  getDepartmentStats: async () => {
    const res = await api.get(`/dashboard/departments`);
    return res.data;
  }
};
