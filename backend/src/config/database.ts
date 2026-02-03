import { Sequelize, QueryTypes } from "sequelize";
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

async function ensureSchemaIntegrity() {
    try {
        const dialect = sequelize.getDialect();
        if (dialect !== 'mssql') return;

        console.log("Checking schema integrity...");

        // Add AcademicYearID if not exists
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Departments' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') 
                    AND name = 'AcademicYearID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Departments] ADD [AcademicYearID] INT NULL;
                    PRINT 'Added AcademicYearID';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add IsActive if not exists
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Departments' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') 
                    AND name = 'IsActive'
                )
                BEGIN
                    ALTER TABLE [dbo].[Departments] ADD [IsActive] BIT NOT NULL DEFAULT 1;
                    PRINT 'Added IsActive';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add Invigilator Columns (Resolution for Delete Admin Error)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Invigilators' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Invigilators]') AND name = 'IsEligible')
                ALTER TABLE [dbo].[Invigilators] ADD [IsEligible] BIT NOT NULL DEFAULT 1 WITH VALUES;
                
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Invigilators]') AND name = 'IsFlagged')
                ALTER TABLE [dbo].[Invigilators] ADD [IsFlagged] BIT NOT NULL DEFAULT 0 WITH VALUES;

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Invigilators]') AND name = 'DepartmentID')
                ALTER TABLE [dbo].[Invigilators] ADD [DepartmentID] INT NULL;
            END
        `, { type: QueryTypes.RAW });

        // Add Faculty Columns
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Faculties' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Faculties]') AND name = 'IsEligible')
                ALTER TABLE [dbo].[Faculties] ADD [IsEligible] BIT NOT NULL DEFAULT 1 WITH VALUES;
            END
        `, { type: QueryTypes.RAW });

        // Add ActivityLog Columns
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ActivityLogs' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'EntityID')
                ALTER TABLE [dbo].[ActivityLogs] ADD [EntityID] INT NULL;

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'EntityType')
                ALTER TABLE [dbo].[ActivityLogs] ADD [EntityType] NVARCHAR(255) NULL;
            END
        `, { type: QueryTypes.RAW });

    } catch (error) {
        console.warn("Schema integrity check warning (non-fatal):", error);
    }
}

export async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log(`Connection Connected: ${sequelize.getDialect()}`);

        await ensureSchemaIntegrity();

        await import("../models/index.js");

        // try {
        //     await sequelize.sync({ alter: true });
        //     console.log("Database synchronized with alter");
        // } catch (syncErr: any) {
        //     console.warn("Database alter sync failed, falling back to standard sync:", syncErr.message);
        await sequelize.sync();
        console.log("Database synchronized (standard)");
        // }

        return true;
    } catch (err: any) {
        console.error("Database Connection Failed:", err.message);
        throw err;
    }
}
