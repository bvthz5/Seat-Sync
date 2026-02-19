import api from '../../../services/api';
import { PaginatedLogs, AuditStats, LogFilters } from '../types/audit';

export const AuditService = {
    getLogs: async (page: number = 1, limit: number = 20, filters: LogFilters = {}) => {
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)]))
        });

        const response = await api.get<{ success: boolean; data: PaginatedLogs }>(`/audit/logs?${queryParams}`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get<{ success: boolean; data: AuditStats }>('/audit/stats');
        return response.data;
    }
};
