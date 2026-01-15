import { sequelize, connectDB } from "../config/database.js";

async function run() {
    try {
        console.log("Connecting (explicit)...");
        await connectDB();

        console.log("Running raw query: SELECT 1");
        const [results] = await sequelize.query("SELECT 1 AS result");
        console.log("Query results:", results);

        const dialect = sequelize.getDialect();
        console.log(`Dialect detected: ${dialect}`);

        if (dialect === "mssql") {
            // MSSQL: use INFORMATION_SCHEMA
            console.log("Listing tables using INFORMATION_SCHEMA...");
            const [tables] = await sequelize.query(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'`
            );
            console.log("Tables:", tables);
        } else if (dialect === "sqlite") {
            // SQLite: use sqlite_master
            console.log("Listing tables using sqlite_master...");
            const [tables] = await sequelize.query(
                `SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name;`
            );
            console.log("Tables:", tables);
        } else {
            console.log("Unknown dialect; attempting generic table listing...");
            try {
                const [tables] = await sequelize.query(
                    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'`
                );
                console.log("Tables:", tables);
            } catch (e: any) {
                console.warn("Table listing not supported for this dialect:", e.message || e);
            }
        }

        console.log("DB check succeeded.");
        process.exitCode = 0;
    } catch (err: any) {
        console.error("DB check failed:", err.message || err);
        process.exitCode = 2;
    } finally {
        try {
            await sequelize.close();
        } catch (e) {
            // ignore
        }
    }
}

run();
