export interface AcademicYear {
    AcademicYearID: number;
    YearName: string;
    StartDate: string;
    EndDate: string;
    IsActive: boolean;
    IsCurrent: boolean;
}

export interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
    AcademicYearID: number;
    IsActive: boolean;
}

export interface Program {
    ProgramID: number;
    ProgramName: string;
    ProgramCode: string;
    DurationYears: number;
    DepartmentID: number;
    AcademicYearID: number;
    IsActive: boolean;
}

export interface Semester {
    SemesterID: number;
    SemesterNumber: number;
    SemesterName: string;
    ProgramID: number;
    AcademicYearID: number;
    IsActive: boolean;
}

export interface Subject {
    SubjectID: number;
    SubjectCode: string;
    SubjectName: string;
    DepartmentID: number;
    SemesterID: number;
    ProgramID: number;
    AcademicYearID: number;
    Credits: number;
    IsActive: boolean;
}

// Responses
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
