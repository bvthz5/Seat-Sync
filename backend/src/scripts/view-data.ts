import { sequelize, connectDB } from "../config/database.js";

async function dumpTable(tableName: string) {
    try {
        console.log(`\n--- ${tableName} (First 10 rows) ---`);
        const [results] = await sequelize.query(`SELECT TOP 10 * FROM [${tableName}]`);
        if (results.length === 0) {
            console.log("No data found.");
        } else {
            console.table(results);
        }
    } catch (err: any) {
        console.warn(`Could not dump ${tableName}:`, err.message);
    }
}

async function run() {
    try {
        await connectDB();
        const [tables] = await sequelize.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'`
        ) as any[];

        const tableNames = tables.map((t: any) => t.TABLE_NAME);
        console.log("Found tables:", tableNames.join(", "));

        // Priority tables
        const priority = ['Users', 'Students', 'Departments', 'Programs', 'Semesters'];

        for (const table of tableNames) {
            if (priority.includes(table)) {
                await dumpTable(table);
            }
        }

        console.log("\nDump complete.");
    } catch (err: any) {
        console.error("Failed to connect or query:", err.message);
    } finally {
        await sequelize.close();
    }
}

run();
