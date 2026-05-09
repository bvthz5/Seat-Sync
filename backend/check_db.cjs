
const { sequelize } = require('./dist/config/database.js');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        const rooms = await sequelize.query("SELECT * FROM Rooms WHERE RoomCode = 'MTB - 105' OR RoomName = 'MTB - 105'", { type: QueryTypes.SELECT });
        console.log("ROOMS:", JSON.stringify(rooms, null, 2));
        if (rooms.length > 0) {
            const seats = await sequelize.query("SELECT COUNT(*) as count FROM Seats WHERE RoomID = " + rooms[0].RoomID, { type: QueryTypes.SELECT });
            console.log("SEATS COUNT:", seats[0].count);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
