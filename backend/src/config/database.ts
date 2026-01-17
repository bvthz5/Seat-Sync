import { Sequelize } from "sequelize";
// Load .env file quietly using a lightweight parser to avoid noisy third-party banners
import * as fs from "fs";
import * as path from "path";

function loadDotenvSilently() {
    try {
        const envPath = path.resolve(process.cwd(), ".env");
        if (!fs.existsSync(envPath)) return;
        const content = fs.readFileSync(envPath, "utf8");
        for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#")) continue;
            const idx = line.indexOf("=");
            if (idx === -1) continue;
            const key = line.slice(0, idx).trim();
            let val = line.slice(idx + 1).trim();
            // unwrap simple quotes
            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (typeof process.env[key] === "undefined") {
                process.env[key] = val;
            }
        }
    } catch (e) {
        // silently ignore
    }
}

loadDotenvSilently();

/* ────────────────────────────────────────────── */
/* Environment variables                          */
/* ────────────────────────────────────────────── */

const DB_NAME = process.env.DB_NAME || "";
const DB_USER = process.env.DB_USER || "";
const DB_PASS = process.env.DB_PASS || "";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_INSTANCE = process.env.DB_INSTANCE || "";
const DB_PORT = Number(process.env.DB_PORT || 1433);
const NODE_ENV = process.env.NODE_ENV || "development";

/* ────────────────────────────────────────────── */
/* SQLite fallback (never crashes the app)        */
/* ────────────────────────────────────────────── */

function createSQLite() {
    console.warn("Using SQLite fallback (MSSQL not available)");
    return new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false
    });
}

/* ────────────────────────────────────────────── */
/* Validate MSSQL config                          */
/* ────────────────────────────────────────────── */

const hasMSSQLConfig =
    DB_NAME.length > 0 &&
    DB_USER.length > 0 &&
    DB_PASS.length > 0 &&
    DB_HOST.length > 0;

/* ────────────────────────────────────────────── */
/* Create Sequelize instance                     */
/* ────────────────────────────────────────────── */

let sequelize: Sequelize;

// Allow explicit opt-in for SQLite fallback. This prevents silent fallbacks in prod.
const DB_FALLBACK = process.env.DB_FALLBACK_TO_SQLITE === "true";

if (!hasMSSQLConfig) {
    sequelize = createSQLite();
} else {
    // Prefer explicit TCP port when provided. If DB_PORT is set (non-zero), use port and ignore DB_INSTANCE.
    // This avoids relying on SQL Server Browser / named-instance resolution when a static port is configured.
    const usePort = DB_PORT && DB_PORT > 0;
    const portOption = usePort ? DB_PORT : (DB_INSTANCE.length > 0 ? undefined : DB_PORT);
    const useInstanceName = DB_INSTANCE.length > 0 && !usePort;

    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        dialect: "mssql",
        host: DB_HOST,
        port: DB_PORT,
        logging: false,
        dialectOptions: {
            options: {
                // Explicit non-encrypted local dev settings (as requested)
                encrypt: false,
                trustServerCertificate: true
            }
        },
        pool: {
            // Safer defaults for production
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
            evict: 10000
        }
    });
}

/* ────────────────────────────────────────────── */
/* Safe connection bootstrap (explicit)          */
/* ────────────────────────────────────────────── */

export async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log("MSSQL Connected:", sequelize.getDatabaseName());

        // Import all models to ensure they are registered
        await import("../models/index.js");

        // Sync all models with the database
        await sequelize.sync({ alter: true }); // Use alter: true for development, force: false for production
        console.log("Database synchronized");

        return true;
    } catch (err: any) {
        console.error("MSSQL Connection Failed:", err.message);

        // Optionally attempt Windows Authentication (msnodesqlv8) if explicitly enabled via env
        if (process.env.DB_USE_WINDOWS_AUTH === "true") {
            try {
                console.log("Attempting MSSQL Windows Authentication (msnodesqlv8)...");

                // dynamic import works under ESM
                let msnodesqlv8: any;
                try {
                    const _mod = await import("msnodesqlv8");
                    // prefer default export but fall back to module itself; cast to any for driver
                    msnodesqlv8 = (_mod as any)?.default ?? (_mod as any);
                } catch (impErr) {
                    // impErr is unknown in TS; cast to any to safely access message
                    throw new Error("msnodesqlv8 not available: " + ((impErr as any)?.message ?? String(impErr)));
                }

                const winSequelize = new Sequelize(DB_NAME, "", "", {
                    dialect: "mssql",
                    // Use msnodesqlv8 driver for integrated auth
                    dialectModule: msnodesqlv8,
                    host: DB_HOST,
                    port: DB_PORT,
                    logging: false,
                    dialectOptions: {
                        trustedConnection: true,
                        options: {
                            trustServerCertificate: true,
                            // Honor DB_ENCRYPT if set in env; default to false
                            encrypt: process.env.DB_ENCRYPT === "true" ? true : false
                        }
                    }
                });

                await winSequelize.authenticate();
                console.log("MSSQL Connected (Windows Authentication)");
                sequelize = winSequelize;
                return true;
            } catch (winErr: any) {
                console.warn("Windows Auth failed or not available:", winErr?.message ?? winErr);
            }
        } else {
            console.log("Skipping Windows Authentication (DB_USE_WINDOWS_AUTH!=true)");
        }

        if (DB_FALLBACK) {
            console.warn("Falling back to SQLite (DB_FALLBACK_TO_SQLITE=true)");
            sequelize = createSQLite();

            try {
                await sequelize.authenticate();
                console.log("SQLite fallback active");
                return true;
            } catch {
                console.error("Critical: SQLite fallback failed");
                throw err;
            }
        } else {
            console.error("Startup aborted: database connection failed and fallback is disabled");
            throw err;
        }
    }
}

/* NOTE: Do not auto-run connectDB() on import to avoid silent startup side-effects. */

/* ────────────────────────────────────────────── */

export { sequelize };
