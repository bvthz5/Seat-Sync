import { sequelize } from "./src/config/database.js";
import { QueryTypes } from "sequelize";

async function checkTables() {
    try {
        await sequelize.authenticate();
        console.log("Connected to database.");
        const tables = await sequelize.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'",
            { type: QueryTypes.SELECT }
        );
        console.log("Tables in database:", tables.map(t => t.TABLE_NAME));
        
        // Specifically check for new tables
        const tableNames = tables.map(t => t.TABLE_NAME);
        if (!tableNames.includes('DutySwaps')) console.log("MISSING: DutySwaps");
        if (!tableNames.includes('IncidentReports')) console.log("MISSING: IncidentReports");
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
}

checkTables();
