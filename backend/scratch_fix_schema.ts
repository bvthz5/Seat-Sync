import { sequelize } from "./src/config/database.js";

async function fixSchema() {
    try {
        console.log("Dropping table InvigilatorAssignments...");
        // Use raw query to avoid Sequelize validation of the old model
        await sequelize.query("DROP TABLE IF EXISTS InvigilatorAssignments");
        console.log("Table dropped successfully.");
        
        // Now let Sequelize sync all models (it will recreate InvigilatorAssignments with the new schema)
        // We import the models index to ensure all associations are loaded
        await import("./src/models/index.js");
        await sequelize.sync({ alter: false }); 
        
        console.log("Schema sync complete. The table has been recreated with the correct foreign key.");
        process.exit(0);
    } catch (error) {
        console.error("Error fixing schema:", error);
        process.exit(1);
    }
}

fixSchema();
