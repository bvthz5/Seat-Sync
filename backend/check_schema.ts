import { sequelize } from './src/config/database.js';
import { QueryTypes } from 'sequelize';

async function main() {
    const cols = await sequelize.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Seats' ORDER BY ORDINAL_POSITION",
        { type: QueryTypes.SELECT }
    );
    console.log("Seats table columns:", JSON.stringify(cols, null, 2));
    await sequelize.close();
}
main();
