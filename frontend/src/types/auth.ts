export interface User {
    UserID: number;
    Email: string;
    Role: 'exam_admin' | 'invigilator' | 'student';
    IsRootAdmin: boolean;
    FullName?: string | null;
}

export interface UserProfile extends User {
    FullName: string | null;
    CreatedAt: string;
    IsActive: boolean;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
    user: User;
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
