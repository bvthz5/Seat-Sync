import { sequelize } from "./src/config/database.js";
import { QueryTypes } from "sequelize";

async function checkSchema() {
    try {
        const results = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Exams'
        `, { type: QueryTypes.SELECT });
        console.log("Exams table columns:");
        console.table(results);
        process.exit(0);
    } catch (error) {
        console.error("Error checking schema:", error);
        process.exit(1);
    }
}

checkSchema();
