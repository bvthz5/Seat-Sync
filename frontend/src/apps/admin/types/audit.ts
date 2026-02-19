export interface AuditLog {
    LogID: number;
    UserID: number;
    Action: string;
    EntityType?: string;
    EntityID?: number;
    IPAddress?: string;
    UserAgent?: string;
    Timestamp: string;
    Details?: string;
    Severity: 'Info' | 'Warning' | 'Critical';
    Status: 'Success' | 'Failure';
    Metadata?: any;
    User?: {
        Username: string;
        Email: string;
        Role: string;
    };
}

export interface AuditStats {
    totalToday: number;
    emergencyActions: number;
    adminActions: number;
    systemEvents: number;
}

export interface LogFilters {
    startDate?: string;
    endDate?: string;
    actor?: string;
    role?: string;
    action?: string;
    severity?: string;
    examId?: number;
    search?: string;
}

export interface PaginatedLogs {
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
}
