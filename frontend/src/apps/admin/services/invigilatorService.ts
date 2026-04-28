import api from '../../../services/api';

export interface Invigilator {
    InvigilatorID: number;
    FacultyID: number;
    Name: string;
    Designation: string;
    ProfileImageURL?: string;
    isEligible: boolean;
    isFlagged: boolean;
    isOnDuty?: boolean;
    totalExams?: number;
    Department?: string;
}

export interface InvigilatorStats {
    total: number;
    active: number;
    eligible: number;
    onDuty: number;
    flagged: number;
}

export interface CreateInvigilatorData {
    FacultyID: string;
    Email: string;
    Name: string;
    Department: string;
    Phone?: string;
    Designation?: string;
}

export const invigilatorService = {
    getAll: async () => {
        const response = await api.get<Invigilator[]>('/invigilators');
        return response.data;
    },
    getStats: async () => {
        const response = await api.get<InvigilatorStats>('/invigilators/stats');
        return response.data;
    },
    create: async (data: CreateInvigilatorData) => {
        const response = await api.post('/invigilators', data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/invigilators/${id}`);
        return response.data;
    },
    toggleFlag: async (id: number) => {
        const response = await api.patch(`/invigilators/${id}/toggle-flag`);
        return response.data;
    },
    toggleEligibility: async (id: number) => {
        const response = await api.patch(`/invigilators/${id}/toggle-eligibility`);
        return response.data;
    },
    clearAll: async () => {
        const response = await api.delete('/invigilators/clear-all');
        return response.data as { message: string; deleted: number };
    },
    bulkImport: async (rows: BulkImportRow[]) => {
        const response = await api.post('/invigilators/bulk-import', { rows });
        return response.data as { message: string; created: number[]; successCount: number; skipped: { row: number; reason: string }[] };
    },
    getRequests: async () => {
        const response = await api.get<InvigilatorRequest[]>('/invigilators/requests');
        return response.data;
    },
    approveRequest: async (id: number) => {
        const response = await api.post(`/invigilators/requests/${id}/approve`);
        return response.data;
    },
    rejectRequest: async (id: number) => {
        const response = await api.post(`/invigilators/requests/${id}/reject`);
        return response.data;
    },
    getLoadStats: async () => {
        const response = await api.get<InvigilatorLoadStat[]>('/invigilators/load-stats');
        return response.data;
    },
    autoAssign: async (date: string, session: string) => {
        const response = await api.post('/invigilators/auto-assign', { date, session });
        return response.data as { assignments: { hallId: number; invigilatorId: number; invigilatorName: string; department?: string; dutyCount: number }[] };
    },
    saveAssignments: async (date: string, session: string, assignments: any[]) => {
        const response = await api.post('/invigilators/save-assignments', { date, session, assignments });
        return response.data;
    },
    getAssignments: async (date: string, session: string) => {
        const response = await api.get('/invigilators/assignments', { params: { date, session } });
        return response.data as { hallId: number; hallName: string; invigilatorId: number; invigilatorName: string; department?: string }[];
    },
    getDashboardData: async () => {
        const response = await api.get('/invigilators/dashboard');
        return response.data;
    },
    getAssignmentDetails: async (id: string | number) => {
        const response = await api.get(`/invigilators/assignments/${id}`);
        return response.data;
    },
    saveAttendance: async (examId: number, students: { StudentID: number, IsPresent: boolean }[]) => {
        const response = await api.post('/invigilators/attendance/save', { examId, students });
        return response.data;
    }
};

export interface InvigilatorLoadStat {
    FacultyID: number;
    Name: string;
    Department: string;
    Designation: string;
    dutyCount: number;
}

export interface InvigilatorRequest {
    RequestID: number;
    FacultyID: string;
    Name: string;
    Email: string;
    Phone: string;
    Department: string;
    Designation: string;
    Reason: string;
    Status: 'PENDING' | 'APPROVED' | 'REJECTED';
    RequestedAt: string;
}

export interface BulkImportRow {
    FacultyID: string | number;
    Email: string;
    Name: string;
    Department: string;
    Phone?: string;
    Designation?: string;
}
