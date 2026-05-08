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
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || 1433);
const DB_ENCRYPT = process.env.DB_ENCRYPT === "true";
const DB_USE_WINDOWS_AUTH = process.env.DB_USE_WINDOWS_AUTH === "true";
const DB_FALLBACK_TO_SQLITE = process.env.DB_FALLBACK_TO_SQLITE === "true";

/* ────────────────────────────────────────────── */
/* SQLite Config                                  */
/* ────────────────────────────────────────────── */

function createSQLite() {
    console.warn("Using SQLite fallback (MSSQL not available or connection failed)");
    const dbPath = path.resolve(process.cwd(), "database.sqlite");
    return new Sequelize({
        dialect: "sqlite",
        storage: dbPath,
        logging: false
    });
}

/* ────────────────────────────────────────────── */
/* Initialize Sequelize                           */
/* ────────────────────────────────────────────── */

let sequelize: Sequelize;

const hasMSSQLConfig =
    DB_NAME.length > 0 &&
    (DB_USE_WINDOWS_AUTH || (DB_USER.length > 0 && DB_PASS.length > 0)) &&
    DB_HOST.length > 0;

console.log(`MSSQL Config Check: Host=${DB_HOST}, Port=${DB_PORT}, Encrypt=${DB_ENCRYPT}, WindowsAuth=${DB_USE_WINDOWS_AUTH}`);

if (hasMSSQLConfig) {
    if (DB_USE_WINDOWS_AUTH) {
        console.log("Initializing Sequelize with MSSQL Windows Authentication...");
        sequelize = new Sequelize(DB_NAME, "", "", {
            dialect: "mssql",
            host: DB_HOST,
            port: DB_PORT,
            logging: false,
            dialectOptions: {
                driver: "msnodesqlv8",
                connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${DB_HOST},${DB_PORT};Database=${DB_NAME};Trusted_Connection=yes;`,
                options: {
                    trustServerCertificate: true
                }
            },
            pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
        });
    } else {
        console.log("Initializing Sequelize with Standard MSSQL Config...");
        sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
            dialect: "mssql",
            host: DB_HOST,
            port: DB_PORT,
            logging: false,
            dialectOptions: {
                options: {
                    encrypt: DB_ENCRYPT,
                    trustServerCertificate: true,
                    connectTimeout: 30000
                }
            },
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        });
    }
} else {
    console.warn("Missing MSSQL Config. Initializing SQLite DB.");
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

                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Programs]') 
                    AND name = 'TotalSemesters'
                )
                BEGIN
                    ALTER TABLE [dbo].[Programs] ADD [TotalSemesters] INT NULL;
                    PRINT 'Added TotalSemesters to Programs';
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

        // Add missing student columns used by registration and dashboard logic
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Students' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Students]')
                    AND name = 'AdmissionDate'
                )
                BEGIN
                    ALTER TABLE [dbo].[Students] ADD [AdmissionDate] DATETIME NULL;
                    PRINT 'Added AdmissionDate to Students';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Students]')
                    AND name = 'BatchYear'
                )
                BEGIN
                    ALTER TABLE [dbo].[Students] ADD [BatchYear] INT NULL;
                    PRINT 'Added BatchYear to Students';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'[dbo].[Students]')
                    AND name = 'SemesterID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Students] ADD [SemesterID] INT NULL;
                    PRINT 'Added SemesterID to Students';
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

        // Fix InvigilatorAssignments Foreign Key (Redirect from Invigilators to Faculties)
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvigilatorAssignments' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                -- Find and drop the old FK that points to Invigilators
                DECLARE @ConstraintName nvarchar(200)
                SELECT @ConstraintName = name
                FROM sys.foreign_keys
                WHERE parent_object_id = OBJECT_ID('InvigilatorAssignments')
                AND referenced_object_id = OBJECT_ID('Invigilators');

                IF @ConstraintName IS NOT NULL
                BEGIN
                    EXEC('ALTER TABLE InvigilatorAssignments DROP CONSTRAINT ' + @ConstraintName);
                    PRINT 'Dropped old FK pointing to Invigilators';
                END

                -- Add the correct FK pointing to Faculties if it doesn't exist
                IF NOT EXISTS (
                    SELECT * FROM sys.foreign_keys 
                    WHERE parent_object_id = OBJECT_ID('InvigilatorAssignments') 
                    AND referenced_object_id = OBJECT_ID('Faculties')
                )
                BEGIN
                    ALTER TABLE InvigilatorAssignments 
                    ADD CONSTRAINT FK_InvigilatorAssignments_Faculties 
                    FOREIGN KEY (InvigilatorID) REFERENCES Faculties(FacultyID);
                    PRINT 'Added correct FK pointing to Faculties';
                END
            END
        `, { type: QueryTypes.RAW });

        // Fix Attendance Foreign Key
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Attendance' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                DECLARE @ConstraintName nvarchar(200)
                SELECT @ConstraintName = name
                FROM sys.foreign_keys
                WHERE parent_object_id = OBJECT_ID('Attendance')
                AND referenced_object_id = OBJECT_ID('Invigilators');

                IF @ConstraintName IS NOT NULL
                BEGIN
                    EXEC('ALTER TABLE Attendance DROP CONSTRAINT ' + @ConstraintName);
                    PRINT 'Dropped Attendance FK pointing to Invigilators';
                END

                IF NOT EXISTS (
                    SELECT * FROM sys.foreign_keys 
                    WHERE parent_object_id = OBJECT_ID('Attendance') 
                    AND referenced_object_id = OBJECT_ID('Faculties')
                )
                BEGIN
                    ALTER TABLE Attendance 
                    ADD CONSTRAINT FK_Attendance_Faculties 
                    FOREIGN KEY (MarkedByInvigilatorID) REFERENCES Faculties(FacultyID);
                    PRINT 'Added Attendance FK pointing to Faculties';
                END
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
                IF EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Faculties]') 
                    AND name = 'DepartmentID'
                )
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

        // Create ExamSeries table if it doesn't exist (MSSQL compatible)
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamSeries' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[ExamSeries] (
                    [ExamSeriesID] INT IDENTITY(1,1) PRIMARY KEY,
                    [SeriesName]   NVARCHAR(100) NOT NULL,
                    [ExamType]     NVARCHAR(20)  NOT NULL DEFAULT 'Internal',
                    [SemesterID]   INT NULL REFERENCES [dbo].[Semesters]([SemesterID]),
                    [Description]  NVARCHAR(255) NULL,
                    [IsActive]     BIT NOT NULL DEFAULT 1,
                    [createdAt]    DATETIME NOT NULL DEFAULT GETDATE(),
                    [updatedAt]    DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created ExamSeries table';
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

                -- Ensure AcademicYearID is nullable
                IF EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[ExamSeries]') 
                    AND name = 'AcademicYearID'
                )
                BEGIN
                    ALTER TABLE [dbo].[ExamSeries] ALTER COLUMN [AcademicYearID] INT NULL;
                    PRINT 'Ensured ExamSeries.AcademicYearID is nullable';
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
                -- Add IsActive if not exists
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'IsActive')
                BEGIN
                    ALTER TABLE [dbo].[Seats] ADD [IsActive] BIT DEFAULT 1 WITH VALUES;
                    PRINT 'Added IsActive to Seats';
                END

                -- Add ZoneID if not exists
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'ZoneID')
                BEGIN
                    ALTER TABLE [dbo].[Seats] ADD [ZoneID] INT NULL;
                    PRINT 'Added ZoneID to Seats';
                END

                -- Handle Column Renames for Thaz branch compatibility
                -- RowLabel -> RowIndex
                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'RowLabel')
                AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'RowIndex')
                BEGIN
                    EXEC sp_rename 'Seats.RowLabel', 'RowIndex', 'COLUMN';
                    PRINT 'Renamed Seats.RowLabel to RowIndex';
                END

                -- BenchNumber -> BenchIndex
                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'BenchNumber')
                AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'BenchIndex')
                BEGIN
                    EXEC sp_rename 'Seats.BenchNumber', 'BenchIndex', 'COLUMN';
                    PRINT 'Renamed Seats.BenchNumber to BenchIndex';
                END

                -- SeatNumber -> SeatIndex
                IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'SeatNumber')
                AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'SeatIndex')
                BEGIN
                    EXEC sp_rename 'Seats.SeatNumber', 'SeatIndex', 'COLUMN';
                    PRINT 'Renamed Seats.SeatNumber to SeatIndex';
                END

                -- Ensure new columns exist even if renames didn't happen (fallback)
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'RowIndex')
                ALTER TABLE [dbo].[Seats] ADD [RowIndex] CHAR(1) NULL;
                
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'BenchIndex')
                ALTER TABLE [dbo].[Seats] ADD [BenchIndex] INT NULL;

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Seats]') AND name = 'SeatIndex')
                ALTER TABLE [dbo].[Seats] ADD [SeatIndex] INT NULL;
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

        // Add Faculty Onboarding fields to Users
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'IsActivated')
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [IsActivated] BIT NOT NULL DEFAULT 0 WITH VALUES;
                    PRINT 'Added IsActivated to Users';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'ActivationToken')
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [ActivationToken] NVARCHAR(255) NULL;
                    PRINT 'Added ActivationToken to Users';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'ActivationExpires')
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [ActivationExpires] DATETIME NULL;
                    PRINT 'Added ActivationExpires to Users';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'FailedLoginAttempts')
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [FailedLoginAttempts] INT NOT NULL DEFAULT 0;
                    PRINT 'Added FailedLoginAttempts to Users';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'AccountLockedUntil')
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [AccountLockedUntil] DATETIME NULL;
                    PRINT 'Added AccountLockedUntil to Users';
                END

                -- Ensure Email is nullable
                IF EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') 
                    AND name = 'Email'
                    AND is_nullable = 0
                )
                BEGIN
                    ALTER TABLE [dbo].[Users] ALTER COLUMN [Email] NVARCHAR(150) NULL;
                    PRINT 'Ensured User.Email is nullable';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add Unique Composite Index to ExamRegistrations
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamRegistrations' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (
                    SELECT * FROM sys.indexes 
                    WHERE name = 'UQ_ExamRegistrations_Student_Exam' 
                    AND object_id = OBJECT_ID(N'[dbo].[ExamRegistrations]')
                )
                BEGIN
                    CREATE UNIQUE INDEX [UQ_ExamRegistrations_Student_Exam] ON [dbo].[ExamRegistrations] ([StudentID], [ExamID]);
                    PRINT 'Added unique index to ExamRegistrations';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add FacultyID to InvigilatorRequests
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvigilatorRequests' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvigilatorRequests]') AND name = 'FacultyID')
                BEGIN
                    ALTER TABLE [dbo].[InvigilatorRequests] ADD [FacultyID] NVARCHAR(50) NOT NULL DEFAULT 'PENDING_ID' WITH VALUES;
                    PRINT 'Added FacultyID to InvigilatorRequests';
                END
            END
        `, { type: QueryTypes.RAW });

        // Add missing columns to Rooms due to Layout Refactor
        await sequelize.query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rooms' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'Capacity')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [Capacity] INT NOT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'RoomType')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [RoomType] NVARCHAR(20) NOT NULL DEFAULT 'ROOM';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'LayoutType')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [LayoutType] NVARCHAR(20) NOT NULL DEFAULT 'CUSTOM';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'RowLayout')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [RowLayout] NVARCHAR(MAX) NOT NULL DEFAULT '[]';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'SeatsPerBench')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [SeatsPerBench] INT NOT NULL DEFAULT 2;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'Status')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [Status] NVARCHAR(20) NOT NULL DEFAULT 'Active';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'ExamUsable')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [ExamUsable] BIT NOT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'IsLayoutLocked')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [IsLayoutLocked] BIT NOT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Rooms]') AND name = 'OverrideCap')
                BEGIN
                    ALTER TABLE [dbo].[Rooms] ADD [OverrideCap] INT NULL;
                END
            END
        `, { type: QueryTypes.RAW });

        // Ensure ExamSeries has missing fields
        await sequelize.query(`
              IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExamSeries' AND TABLE_SCHEMA = 'dbo')
              BEGIN
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ExamSeries]') AND name = 'Description')
                  BEGIN
                      ALTER TABLE [dbo].[ExamSeries] ADD [Description] NVARCHAR(255) NULL;
                      PRINT 'Added Description to ExamSeries';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ExamSeries]') AND name = 'IsActive')
                  BEGIN
                      ALTER TABLE [dbo].[ExamSeries] ADD [IsActive] BIT NOT NULL DEFAULT 1;
                      PRINT 'Added IsActive to ExamSeries';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ExamSeries]') AND name = 'AcademicYearID')
                  BEGIN
                      ALTER TABLE [dbo].[ExamSeries] ADD [AcademicYearID] INT NULL;
                      PRINT 'Added AcademicYearID to ExamSeries';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ExamSeries]') AND name = 'ExamType')
                  BEGIN
                      ALTER TABLE [dbo].[ExamSeries] ADD [ExamType] NVARCHAR(20) NOT NULL DEFAULT 'Internal';
                      PRINT 'Added ExamType to ExamSeries';
                  END
              END
          `, { type: QueryTypes.RAW });

        // Ensure Subjects has missing SemesterID
        await sequelize.query(`
              IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Subjects' AND TABLE_SCHEMA = 'dbo')
              BEGIN
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Subjects]') AND name = 'SemesterID')
                  BEGIN
                      ALTER TABLE [dbo].[Subjects] ADD [SemesterID] INT NULL;
                      PRINT 'Added SemesterID to Subjects';
                  END
              END
          `, { type: QueryTypes.RAW });

        // Ensure Exams has missing fields
        await sequelize.query(`
              IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Exams' AND TABLE_SCHEMA = 'dbo')
              BEGIN
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'Duration')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [Duration] INT NOT NULL DEFAULT 180;
                      PRINT 'Added Duration to Exams';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'Status')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [Status] NVARCHAR(20) NOT NULL DEFAULT 'Scheduled';
                      PRINT 'Added Status to Exams';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'RoomAllocationStatus')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [RoomAllocationStatus] NVARCHAR(20) NULL DEFAULT 'Pending';
                      PRINT 'Added RoomAllocationStatus to Exams';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'IsEmergencyMode')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [IsEmergencyMode] BIT NOT NULL DEFAULT 0;
                      PRINT 'Added IsEmergencyMode to Exams';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'AttendanceLocked')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [AttendanceLocked] BIT NOT NULL DEFAULT 0;
                      PRINT 'Added AttendanceLocked to Exams';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'AuditStatus')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [AuditStatus] NVARCHAR(20) NULL DEFAULT 'Pending';
                      PRINT 'Added AuditStatus to Exams';
                  END
                  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Exams]') AND name = 'ConflictDetails')
                  BEGIN
                      ALTER TABLE [dbo].[Exams] ADD [ConflictDetails] NVARCHAR(MAX) NULL;
                      PRINT 'Added ConflictDetails to Exams';
                  END
              END
          `, { type: QueryTypes.RAW });

        // Ensure UserProfiles table exists
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserProfiles' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[UserProfiles] (
                    [UserID] INT PRIMARY KEY,
                    [FullName] NVARCHAR(150) NOT NULL,
                    [Phone] NVARCHAR(20) NULL,
                    [Avatar] NVARCHAR(MAX) NULL,
                    [DateOfBirth] DATE NULL,
                    [Gender] NVARCHAR(20) NULL,
                    CONSTRAINT [FK_UserProfiles_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID]) ON DELETE CASCADE
                );
                PRINT 'Created UserProfiles table';
            END
            ELSE
            BEGIN
                -- Add missing columns if table already exists
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND name = 'Avatar')
                BEGIN
                    ALTER TABLE [dbo].[UserProfiles] ADD [Avatar] NVARCHAR(MAX) NULL;
                    PRINT 'Added Avatar to UserProfiles';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND name = 'DateOfBirth')
                BEGIN
                    ALTER TABLE [dbo].[UserProfiles] ADD [DateOfBirth] DATE NULL;
                    PRINT 'Added DateOfBirth to UserProfiles';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND name = 'Gender')
                BEGIN
                    ALTER TABLE [dbo].[UserProfiles] ADD [Gender] NVARCHAR(20) NULL;
                    PRINT 'Added Gender to UserProfiles';
                END
            END
        `, { type: QueryTypes.RAW });

        // ─── INTERNAL EXAM STRUCTURE TABLES ───────────────────────────────────────
        // These are the isolated tables for the Internal Exam College Structure module.
        // They must never be joined with or referenced from End Semester tables.
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InternalBlocks' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[InternalBlocks] (
                    [BlockID]   INT IDENTITY(1,1) PRIMARY KEY,
                    [BlockName] NVARCHAR(50) NOT NULL,
                    [Status]    NVARCHAR(20) NOT NULL DEFAULT 'Active'
                );
                PRINT 'Created InternalBlocks table';
            END
        `, { type: QueryTypes.RAW });

        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InternalFloors' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[InternalFloors] (
                    [FloorID]     INT IDENTITY(1,1) PRIMARY KEY,
                    [BlockID]     INT NOT NULL REFERENCES [dbo].[InternalBlocks]([BlockID]),
                    [FloorNumber] INT NOT NULL,
                    [Status]      NVARCHAR(20) NOT NULL DEFAULT 'Active'
                );
                PRINT 'Created InternalFloors table';
            END
        `, { type: QueryTypes.RAW });

        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InternalRooms' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[InternalRooms] (
                    [RoomID]       INT IDENTITY(1,1) PRIMARY KEY,
                    [BlockID]      INT NOT NULL REFERENCES [dbo].[InternalBlocks]([BlockID]),
                    [FloorID]      INT NOT NULL REFERENCES [dbo].[InternalFloors]([FloorID]),
                    [RoomCode]     NVARCHAR(50)  NOT NULL,
                    [RoomType]     NVARCHAR(50)  NOT NULL DEFAULT 'Classroom',
                    [TotalCapacity] INT NOT NULL DEFAULT 0,
                    [OverrideCap]  INT NULL,
                    [RowLayout]    NVARCHAR(MAX) NOT NULL DEFAULT '[]',
                    [SeatsPerBench] INT NOT NULL DEFAULT 2,
                    [SeatMode]     NVARCHAR(20)  NOT NULL DEFAULT 'Dual',
                    [Status]       NVARCHAR(20)  NOT NULL DEFAULT 'Active',
                    [ExamUsable]   BIT NOT NULL DEFAULT 1,
                    [createdAt]    DATETIME NOT NULL DEFAULT GETDATE(),
                    [updatedAt]    DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created InternalRooms table';
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InternalRooms]') AND name = 'RoomType')
                BEGIN
                    ALTER TABLE [dbo].[InternalRooms] ADD [RoomType] NVARCHAR(50) NOT NULL DEFAULT 'Classroom';
                    PRINT 'Added RoomType to InternalRooms';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InternalRooms]') AND name = 'SeatMode')
                BEGIN
                    ALTER TABLE [dbo].[InternalRooms] ADD [SeatMode] NVARCHAR(20) NOT NULL DEFAULT 'Dual';
                    PRINT 'Added SeatMode to InternalRooms';
                END
            END
        `, { type: QueryTypes.RAW });

        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InternalSeats' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[InternalSeats] (
                    [SeatID]      INT IDENTITY(1,1) PRIMARY KEY,
                    [RoomID]      INT NOT NULL REFERENCES [dbo].[InternalRooms]([RoomID]),
                    [RowLabel]    CHAR(1)  NOT NULL,
                    [BenchNumber] INT NOT NULL,
                    [SeatNumber]  INT NOT NULL,
                    [IsActive]    BIT NOT NULL DEFAULT 1
                );
                PRINT 'Created InternalSeats table';
            END
        `, { type: QueryTypes.RAW });

        // Create IncidentReports table if not exists
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IncidentReports' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[IncidentReports] (
                    [ReportID]    INT IDENTITY(1,1) PRIMARY KEY,
                    [ExamID]      INT NOT NULL REFERENCES [dbo].[Exams]([ExamID]),
                    [RoomID]      INT NOT NULL REFERENCES [dbo].[Rooms]([RoomID]),
                    [FacultyID]   INT NOT NULL REFERENCES [dbo].[Faculties]([FacultyID]),
                    [Type]        NVARCHAR(50) NOT NULL,
                    [Description] NVARCHAR(MAX) NOT NULL,
                    [Status]      NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    [CreatedAt]   DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created IncidentReports table';
            END
        `, { type: QueryTypes.RAW });

        // Create DutySwaps table if not exists
        await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DutySwaps' AND TABLE_SCHEMA = 'dbo')
            BEGIN
                CREATE TABLE [dbo].[DutySwaps] (
                    [SwapID]       INT IDENTITY(1,1) PRIMARY KEY,
                    [ExamID]       INT NOT NULL REFERENCES [dbo].[Exams]([ExamID]),
                    [RoomID]       INT NOT NULL REFERENCES [dbo].[Rooms]([RoomID]),
                    [RequesterID]  INT NOT NULL REFERENCES [dbo].[Faculties]([FacultyID]),
                    [SubstituteID] INT NULL REFERENCES [dbo].[Faculties]([FacultyID]),
                    [Reason]       NVARCHAR(MAX) NOT NULL,
                    [Status]       NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    [CreatedAt]    DATETIME NOT NULL DEFAULT GETDATE(),
                    [UpdatedAt]    DATETIME NOT NULL DEFAULT GETDATE()
                );
                PRINT 'Created DutySwaps table';
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
    } catch (err: any) {
        console.error("Database Connection Failed:", err.message);

        const isMSSQL = sequelize.getDialect() === 'mssql';
        if (isMSSQL && DB_FALLBACK_TO_SQLITE) {
            console.warn("MSSQL connection failed. Falling back to SQLite as configured...");
            sequelize = createSQLite();
            await sequelize.authenticate();
            console.log("Connected to SQLite fallback database.");
        } else {
            throw err;
        }
    }

    try {
        await ensureSchemaIntegrity();

        await import("../models/index.js");

        const dialect = sequelize.getDialect();
        if (dialect === 'mssql') {
            await sequelize.sync();
            console.log("Database synchronized (standard, alter skipped for MSSQL)");
        } else {
            try {
                await sequelize.sync({ alter: true });
                console.log("Database synchronized with alter");
            } catch (syncErr: any) {
                console.warn("Database alter sync failed, falling back to standard sync:", syncErr.message);
                await sequelize.sync();
                console.log("Database synchronized (standard fallback)");
            }
        }

        return true;
    } catch (err: any) {
        console.error("Database Initialization Failed:", err.message);
        throw err;
    }
}
