
import { sequelize, connectDB } from "../config/database.js";

async function forceSync() {
    try {
        console.log("Connecting...");
        await connectDB();
        console.log("Force syncing database...");
        await sequelize.sync({ force: true });
        console.log("Database force synced successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Force sync failed:", error);
        process.exit(1);
    }
}

forceSync();
