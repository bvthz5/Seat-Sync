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

        // Add IsActive to Departments
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
                    PRINT 'Added IsActive to Departments';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add IsActive and AcademicYearID to Programs (Fix for Import Error)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Programs' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Programs]') 
                    AND name = 'AcademicYearID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Programs] ADD [AcademicYearID] INT NULL;
                    PRINT 'Added AcademicYearID to Programs';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Programs]') 
                    AND name = 'IsActive'
                )
                BEGIN
                    ALTER TABLE [dbo].[Programs] ADD [IsActive] BIT NOT NULL DEFAULT 1;
                    PRINT 'Added IsActive to Programs';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Programs]') 
                    AND name = 'DepartmentID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Programs] ADD [DepartmentID] INT NULL;
                    PRINT 'Added DepartmentID to Programs';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Programs]') 
                    AND name = 'ProgramCode'
                )
                BEGIN
                    ALTER TABLE [dbo].[Programs] ADD [ProgramCode] NVARCHAR(20) NULL;
                    PRINT 'Added ProgramCode to Programs';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Programs]') 
                    AND name = 'DurationYears'
                )
                BEGIN
                    ALTER TABLE [dbo].[Programs] ADD [DurationYears] INT NULL;
                    PRINT 'Added DurationYears to Programs';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add IsActive and SemesterName to Semesters (Fix for Import Error)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Semesters' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Semesters]') 
                    AND name = 'IsActive'
                )
                BEGIN
                    ALTER TABLE [dbo].[Semesters] ADD [IsActive] BIT NOT NULL DEFAULT 1;
                    PRINT 'Added IsActive to Semesters';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Semesters]') 
                    AND name = 'SemesterName'
                )
                BEGIN
                    ALTER TABLE [dbo].[Semesters] ADD [SemesterName] NVARCHAR(50) NULL;
                    PRINT 'Added SemesterName to Semesters';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Semesters]') 
                    AND name = 'AcademicYearID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Semesters] ADD [AcademicYearID] INT NULL;
                    PRINT 'Added AcademicYearID to Semesters';
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

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Faculties]') AND name = 'Department')
                BEGIN
                    ALTER TABLE [dbo].[Faculties] ADD [Department] NVARCHAR(150) NOT NULL CONSTRAINT DF_Faculties_Department DEFAULT '' WITH VALUES;
                    PRINT 'Added Department to Faculties';
                END

                -- Ensure DepartmentID is nullable (Fix for decoupling)
                BEGIN
                    ALTER TABLE [dbo].[Faculties] ALTER COLUMN [DepartmentID] INT NULL;
                    PRINT 'Ensured Faculty.DepartmentID is nullable';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add StaffCode to Faculties (for alphanumeric import IDs)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Faculties' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Faculties]') AND name = 'StaffCode')
                BEGIN
                    ALTER TABLE [dbo].[Faculties] ADD [StaffCode] NVARCHAR(50) NULL;
                    PRINT 'Added StaffCode to Faculties';
                    
                    -- Optional: Create unique index if needed later, but allowing NULLs helps with legacy data
                END
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

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'IPAddress')
                ALTER TABLE [dbo].[ActivityLogs] ADD [IPAddress] NVARCHAR(45) NULL;

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'UserAgent')
                ALTER TABLE [dbo].[ActivityLogs] ADD [UserAgent] NVARCHAR(500) NULL;

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'Severity')
                BEGIN
                    ALTER TABLE [dbo].[ActivityLogs] ADD [Severity] NVARCHAR(20) NOT NULL DEFAULT 'Info' WITH VALUES;
                    PRINT 'Added Severity to ActivityLogs';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'Status')
                BEGIN
                    ALTER TABLE [dbo].[ActivityLogs] ADD [Status] NVARCHAR(20) NOT NULL DEFAULT 'Success' WITH VALUES;
                    PRINT 'Added Status to ActivityLogs';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ActivityLogs]') AND name = 'Metadata')
                BEGIN
                    ALTER TABLE [dbo].[ActivityLogs] ADD [Metadata] NVARCHAR(MAX) NULL;
                    PRINT 'Added Metadata to ActivityLogs';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add ExamSeries SemesterID Nullable Fix
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamSeries' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                -- Ensure SemesterID is nullable
                IF EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[ExamSeries]') 
                    AND name = 'SemesterID'
                )
                BEGIN
                    ALTER TABLE [dbo].[ExamSeries] ALTER COLUMN [SemesterID] INT NULL;
                    PRINT 'Ensured ExamSeries.SemesterID is nullable';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add ExamSeriesID to Exams (Fix for Timetable Import Error)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Exams' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') 
                    AND name = 'ExamSeriesID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Exams] ADD [ExamSeriesID] INT NULL;
                    PRINT 'Added ExamSeriesID to Exams';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add Audit Columns to Exams
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Exams' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') 
                    AND name = 'AuditStatus'
                )
                BEGIN
                    ALTER TABLE [dbo].[Exams] ADD [AuditStatus] NVARCHAR(20) DEFAULT 'Pending' WITH VALUES;
                    PRINT 'Added AuditStatus to Exams';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') 
                    AND name = 'ConflictDetails'
                )
                BEGIN
                    ALTER TABLE [dbo].[Exams] ADD [ConflictDetails] NVARCHAR(MAX) NULL;
                    PRINT 'Added ConflictDetails to Exams';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') 
                    AND name = 'ExamDate'
                )
                BEGIN
                    ALTER TABLE [dbo].[Exams] ADD [ExamDate] DATE NULL;
                    PRINT 'Added ExamDate to Exams';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') 
                    AND name = 'IsEmergencyMode'
                )
                BEGIN
                    ALTER TABLE [dbo].[Exams] ADD [IsEmergencyMode] BIT NOT NULL CONSTRAINT DF_Exams_IsEmergencyMode DEFAULT 0;
                    PRINT 'Added IsEmergencyMode to Exams';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') 
                    AND name = 'AttendanceLocked'
                )
                BEGIN
                    ALTER TABLE [dbo].[Exams] ADD [AttendanceLocked] BIT NOT NULL CONSTRAINT DF_Exams_AttendanceLocked DEFAULT 0;
                    PRINT 'Added AttendanceLocked to Exams';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add Room Columns (Hall Mode)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rooms' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'RoomType')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [RoomType] NVARCHAR(20) DEFAULT 'ROOM' WITH VALUES;
                    PRINT 'Added RoomType to Rooms';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'IsLayoutLocked')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [IsLayoutLocked] BIT DEFAULT 0 WITH VALUES;
                    PRINT 'Added IsLayoutLocked to Rooms';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add Seat Columns (Hall Mode)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Seats' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'IsActive')
                BEGIN
                    ALTER TABLE [dbo].[Seats] ADD [IsActive] BIT DEFAULT 1 WITH VALUES;
                    PRINT 'Added IsActive to Seats';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'ZoneID')
                BEGIN
                    ALTER TABLE [dbo].[Seats] ADD [ZoneID] INT NULL;
                    PRINT 'Added ZoneID to Seats';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add BenchMode to Rooms (New Feature persistence)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rooms' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'BenchMode')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [BenchMode] NVARCHAR(20) NOT NULL CONSTRAINT DF_Rooms_BenchMode DEFAULT 'PAIRED';
                    PRINT 'Added BenchMode to Rooms';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add Color to Zones (Visualization Feature)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Zones' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Zones]') AND name = 'Color')
                BEGIN
                    ALTER TABLE [dbo].[Zones] ADD [Color] NVARCHAR(20) NULL;
                    PRINT 'Added Color to Zones';
                END
            END
        `, { type: QueryTypes.RAW });

        // Make Students.DepartmentID, ProgramID, SemesterID, BatchYear nullable
        // (required so students can be auto-created from seating import without academic setup)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Students' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                -- Drop FK constraints referencing nullable columns before altering them (MSSQL requirement)
                DECLARE @sql NVARCHAR(MAX) = '';
                SELECT @sql += 'ALTER TABLE [dbo].[Students] DROP CONSTRAINT ' + fk.name + '; '
                FROM sys.foreign_keys fk
                INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
                WHERE fk.parent_object_id = OBJECT_ID(N'[dbo].[Students]')
                  AND c.name IN ('DepartmentID','ProgramID','SemesterID')
                  AND c.is_nullable = 0;
                IF LEN(@sql) > 0 EXEC sp_executesql @sql;

                ALTER TABLE [dbo].[Students] ALTER COLUMN [DepartmentID] INT NULL;
                ALTER TABLE [dbo].[Students] ALTER COLUMN [ProgramID] INT NULL;
                ALTER TABLE [dbo].[Students] ALTER COLUMN [SemesterID] INT NULL;
                ALTER TABLE [dbo].[Students] ALTER COLUMN [BatchYear] INT NULL;
                PRINT 'Made Students DepartmentID/ProgramID/SemesterID/BatchYear nullable';
            END
        `, { type: QueryTypes.RAW });

    } catch (error) {
        console.warn("Schema integrity check warning (non-fatal):", error);
    }
}

export async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log(`Connection Connected: ${sequelize.getDialect()} `);

        await ensureSchemaIntegrity();

        await import("../models/index.js");

        try {
            await sequelize.sync({ alter: true });
            console.log("Database synchronized with alter");
        } catch (syncErr: any) {
            console.warn("Database alter sync failed, falling back to standard sync:", syncErr.message);
            await sequelize.sync();
            console.log("Database synchronized (standard)");
        }

        return true;
    } catch (err: any) {
        console.error("Database Connection Failed:", err.message);
        throw err;
    }
}
