export interface LoginRequest {
    email: string;
    password: string;
    role?: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
    user: {
        UserID: number;
        Email: string | null;
        Role: string;
        IsRootAdmin: boolean;
        IsPasswordChanged: boolean;
    };
}

export interface RefreshResponse {
    accessToken: string;
}

export interface JWTPayload {
    UserID: number;
    Email: string | null;
    Role: string;
    IsRootAdmin: boolean;
    IsPasswordChanged: boolean;
}

export interface RefreshTokenPayload {
    UserID: number;
    tokenVersion?: number;
}