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
    Name: string;
    Department: string;
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
        return response.data as { message: string; created: number; skipped: { row: number; reason: string }[] };
    }
};

export interface BulkImportRow {
    FacultyID?: string | number;
    Name: string;
    Department: string;
    Designation?: string;
}
