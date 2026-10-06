import jwt from "jsonwebtoken";
import type { JWTPayload, RefreshTokenPayload } from "../interfaces/auth.interfaces.js";

/**
 * Sign an access token with 15 minutes expiry
 */
export const signAccessToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET environment variable is not set");
  }

  return jwt.sign(payload, secret, { expiresIn: (process.env.JWT_ACCESS_EXPIRY || "15m") as any });
};

/**
 * Sign a refresh token with configurable expiry (default 7 days)
 */
export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  }

  return jwt.sign(payload, secret, { expiresIn: (process.env.JWT_REFRESH_EXPIRY || "7d") as any });
};

/**
 * Verify an access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET environment variable is not set");
  }

  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  }

  try {
    return jwt.verify(token, secret) as RefreshTokenPayload;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}