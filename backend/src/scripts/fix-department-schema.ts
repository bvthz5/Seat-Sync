// Schema fix script
import { sequelize } from "../config/database.js";
import { QueryTypes } from "sequelize";

async function fixSchema() {
    try {
        console.log("Starting schema fix...");
        await sequelize.authenticate();
        console.log("Connected.");

        // Add AcademicYearID if not exists
        try {
            await sequelize.query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') 
                    AND name = 'AcademicYearID'
                )
                BEGIN
                    ALTER TABLE [dbo].[Departments] ADD [AcademicYearID] INT NULL;
                    PRINT 'Added AcademicYearID';
                END
            `, { type: QueryTypes.RAW });
            console.log("Checked/Added AcademicYearID");
        } catch (e: any) {
            console.error("Error adding AcademicYearID:", e.message);
        }

        // Add IsActive if not exists
        try {
            await sequelize.query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Departments]') 
                    AND name = 'IsActive'
                )
                BEGIN
                    ALTER TABLE [dbo].[Departments] ADD [IsActive] BIT NOT NULL DEFAULT 1;
                    PRINT 'Added IsActive';
                END
            `, { type: QueryTypes.RAW });
            console.log("Checked/Added IsActive");
        } catch (e: any) {
            console.error("Error adding IsActive:", e.message);
        }

        console.log("Schema fix complete.");
        process.exit(0);
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}

fixSchema();
