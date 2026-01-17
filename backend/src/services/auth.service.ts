import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import type { LoginRequest, LoginResponse, JWTPayload } from "../interfaces/auth.interfaces.js";

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    /**
     * Validate admin credentials and generate tokens
     */
    static async login(credentials: LoginRequest): Promise<LoginResponse> {
        const { email, password } = credentials;

        // Find user by email
        const user = await User.findOne({
            where: {
                Email: email,
                Role: "exam_admin", // Only exam admins can log in
                IsActive: true,
            },
        });

        if (!user) {
            throw new Error("Invalid credentials or account is inactive");
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        if (!isPasswordValid) {
            throw new Error("Invalid credentials");
        }

        // Generate tokens
        const payload: JWTPayload = {
            UserID: user.UserID,
            Email: user.Email,
            Role: user.Role,
            IsRootAdmin: user.IsRootAdmin,
        };

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken({ UserID: user.UserID });

        return {
            accessToken,
            refreshToken,
            user: {
                UserID: user.UserID,
                Email: user.Email,
                Role: user.Role,
                IsRootAdmin: user.IsRootAdmin,
            },
        };
    }

    /**
     * Refresh access token using refresh token
     */
    static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        // Verify refresh token
        const payload = verifyRefreshToken(refreshToken);

        // Find user
        const user = await User.findByPk(payload.UserID);
        if (!user || !user.IsActive || user.Role !== "exam_admin") {
            throw new Error("Invalid refresh token or user is inactive");
        }

        // Generate new access token
        const accessPayload: JWTPayload = {
            UserID: user.UserID,
            Email: user.Email,
            Role: user.Role,
            IsRootAdmin: user.IsRootAdmin,
        };

        const newAccessToken = signAccessToken(accessPayload);

        // Optionally rotate refresh token (generate new one)
        const newRefreshToken = signRefreshToken({ UserID: user.UserID });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    /**
     * Logout (invalidate refresh token)
     * In a stateless JWT system, logout is primarily handled on the client side
     * by clearing tokens. Server-side invalidation would require a token blacklist.
     */
    static async logout(): Promise<void> {
        // In a stateless system, we don't need to do anything server-side
        // The client should clear the refresh token cookie
        return Promise.resolve();
    }

    /**
     * Hash a password for storage
     */
    static async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
}