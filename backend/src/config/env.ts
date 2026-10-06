import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Validate critical environment variables for security & stability
 */
const validateEnvironment = () => {
    const isProd = process.env.NODE_ENV === "production";
    const warnings: string[] = [];
    const errors: string[] = [];

    // JWT Security Validation
    if (!process.env.JWT_ACCESS_SECRET) {
        if (isProd) {
            errors.push("JWT_ACCESS_SECRET is required in production!");
        } else {
            warnings.push("JWT_ACCESS_SECRET is not set. Token generation will fail.");
        }
    } else if (process.env.JWT_ACCESS_SECRET.length < 16 && isProd) {
        warnings.push("JWT_ACCESS_SECRET is shorter than 16 characters. Use a high-entropy secret in production.");
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        if (isProd) {
            errors.push("JWT_REFRESH_SECRET is required in production!");
        } else {
            warnings.push("JWT_REFRESH_SECRET is not set. Token refresh will fail.");
        }
    } else if (process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET && process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
        warnings.push("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET should not be identical.");
    }

    // Admin credentials validation
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        warnings.push("ADMIN_EMAIL or ADMIN_PASSWORD not configured. Initial admin account seeding will be skipped.");
    }

    // Database credentials validation
    if (process.env.DB_DIALECT !== "sqlite") {
        if (!process.env.DB_NAME) warnings.push("DB_NAME is not set.");
        if (!process.env.DB_USER) warnings.push("DB_USER is not set.");
        if (isProd && !process.env.DB_PASS) warnings.push("DB_PASS is empty in production mode.");
    }

    if (warnings.length > 0 && !isProd) {
        warnings.forEach((w) => console.warn(`[Config Warning] ${w}`));
    }

    if (errors.length > 0) {
        errors.forEach((e) => console.error(`[Config Fatal Error] ${e}`));
        if (isProd) {
            throw new Error(`Fatal configuration errors:\n${errors.join("\n")}`);
        }
    }
};

validateEnvironment();
console.log(`[Config] Environment variables loaded. (NODE_ENV=${process.env.NODE_ENV || "development"})`);
