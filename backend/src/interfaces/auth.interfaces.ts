export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
    user: {
        UserID: number;
        Email: string;
        Role: string;
        IsRootAdmin: boolean;
    };
}

export interface RefreshResponse {
    accessToken: string;
}

export interface JWTPayload {
    UserID: number;
    Email: string;
    Role: string;
    IsRootAdmin: boolean;
}

export interface RefreshTokenPayload {
    UserID: number;
    tokenVersion?: number;
}