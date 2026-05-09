
import { sequelize } from "../backend/src/config/database.js";

async function describe() {
    try {
        const [results] = await sequelize.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Invigilators'");
        console.log("--- Invigilators Columns ---");
        console.log(JSON.stringify(results, null, 2));

        const [results2] = await sequelize.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Faculties'");
        console.log("--- Faculties Columns ---");
        console.log(JSON.stringify(results2, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

describe();
