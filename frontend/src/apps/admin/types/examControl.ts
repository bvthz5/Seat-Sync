export enum ExamStatus {
    DRAFT = 'Draft',
    READY = 'Ready',
    PUBLISHED = 'Published',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    ARCHIVED = 'Archived',
    CANCELLED = 'Cancelled'
}

export interface Exam {
    ExamID: number;
    ExamName: string;
    SubjectID: number;
    ExamDate: string;
    Session: string;
    Duration: number;
    Status: ExamStatus;
    IsEmergencyMode: boolean;
    AttendanceLocked: boolean;
    AuditStatus?: 'Clean' | 'Conflict' | 'Pending';
    ConflictDetails?: string;
}

export interface ActivityLog {
    LogID: number;
    Action: string;
    Details: string;
    Timestamp: string;
    User: {
        Username: string;
        Role: string;
    };
    IPAddress: string;
}

export interface ExamMetrics {
    studentsAllocated: number;
    roomsAllocated: number;
    seatingGenerated: boolean;
    attendanceLocked: boolean;
}

export interface ExamDetail extends Exam {
    metrics: ExamMetrics;
}
