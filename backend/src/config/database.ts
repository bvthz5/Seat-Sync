import { Sequelize } from "sequelize";
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
const DB_PORT = Number(process.env.DB_PORT || 1433);
const DB_ENCRYPT = process.env.DB_ENCRYPT === "true";

/* ────────────────────────────────────────────── */
/* SQLite Config                                  */
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
/* Initialize Sequelize                           */
/* ────────────────────────────────────────────── */

let sequelize: Sequelize;

const hasMSSQLConfig =
    DB_NAME.length > 0 &&
    DB_USER.length > 0 &&
    DB_PASS.length > 0 &&
    DB_HOST.length > 0;

// Log the auth decision for debugging
console.log(`MSSQL Config Check: Host=${DB_HOST}, Encrypt=${DB_ENCRYPT}`);

if (hasMSSQLConfig) {
    console.log("Initializing Sequelize with Standard MSSQL Config...");
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        dialect: "mssql",
        host: DB_HOST,
        port: DB_PORT,
        logging: false,
        dialectOptions: {
            options: {
                encrypt: DB_ENCRYPT,
                trustServerCertificate: true
            }
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    console.warn("Missing MSSQL Config. Initializing SQLite Memory DB.");
    sequelize = createSQLite();
}

export { sequelize };

/* ────────────────────────────────────────────── */
/* Connection Handler                            */
/* ────────────────────────────────────────────── */

export async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log(`Connection Connected: ${sequelize.getDialect()}`);

        await import("../models/index.js");

        await sequelize.sync();
        console.log("Database synchronized");

        return true;
    } catch (err: any) {
        console.error("Database Connection Failed:", err.message);
        throw err;
    }
}
