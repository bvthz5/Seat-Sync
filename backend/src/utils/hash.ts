import crypto from 'crypto';

/**
 * Hash a simple string (like a reset token) using SHA256.
 * Note: This is NOT for passwords. Use bcrypt for passwords.
 */
export function hashToken(token: string): string {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

/**
 * Generate a random secure token
 */
export function generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
}
