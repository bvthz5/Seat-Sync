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

        // Add Notifications and NotificationRecipients Tables
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[Notifications] (
                    [NotificationID] INT IDENTITY(1,1) PRIMARY KEY,
                    [Title] NVARCHAR(200) NOT NULL,
                    [Message] NVARCHAR(MAX) NOT NULL,
                    [Type] NVARCHAR(20) NOT NULL DEFAULT 'INFO',
                    [Category] NVARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
                    [TargetType] NVARCHAR(20) NOT NULL DEFAULT 'ALL',
                    [TargetId] NVARCHAR(255) NULL,
                    [Priority] NVARCHAR(20) NOT NULL DEFAULT 'NORMAL',
                    [Metadata] NVARCHAR(MAX) NULL,
                    [SentBy] INT NOT NULL DEFAULT 0,
                    [SentAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
                    [ExpiresAt] DATETIME2 NULL
                );
                PRINT 'Created Notifications table';
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'NotificationRecipients' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[NotificationRecipients] (
                    [RecipientID] INT IDENTITY(1,1) PRIMARY KEY,
                    [NotificationID] INT NOT NULL,
                    [UserID] INT NOT NULL,
                    [IsRead] BIT NOT NULL DEFAULT 0,
                    [ReadAt] DATETIME2 NULL,
                    CONSTRAINT [FK_NotificationRecipients_Notifications] FOREIGN KEY ([NotificationID]) REFERENCES [Notifications]([NotificationID]) ON DELETE CASCADE,
                    CONSTRAINT [FK_NotificationRecipients_Users] FOREIGN KEY ([UserID]) REFERENCES [Users]([UserID]) ON DELETE CASCADE
                );
                PRINT 'Created NotificationRecipients table';
                
                -- Create Indexes for performance
                CREATE INDEX [IX_NotificationRecipients_UserID_IsRead] ON [dbo].[NotificationRecipients] ([UserID], [IsRead]);
                CREATE UNIQUE INDEX [UX_NotificationRecipients_Notification_User] ON [dbo].[NotificationRecipients] ([NotificationID], [UserID]);
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
