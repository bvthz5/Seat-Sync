
const { sequelize } = require('./dist/config/database.js');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        const columns = await sequelize.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Seats'", { type: QueryTypes.SELECT });
        console.log("COLUMNS:", columns.map(c => c.COLUMN_NAME));
        
        const seat = await sequelize.query("SELECT TOP 1 * FROM Seats", { type: QueryTypes.SELECT });
        console.log("FIRST SEAT:", JSON.stringify(seat[0], null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
