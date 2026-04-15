import { sequelize } from './config/database.js';

async function alterDb() {
    try {
        await sequelize.authenticate();
        await sequelize.query('ALTER TABLE Seats ADD ZoneID INT NULL;');
        console.log('Added ZoneID to Seats');
    } catch(e) {
        console.log('Error or already exists', e.message);
    }
    try {
        await sequelize.query('ALTER TABLE Seats ADD CONSTRAINT FK_Seats_Zones FOREIGN KEY (ZoneID) REFERENCES Zones(ZoneID);');
        console.log('Added FK to Seats');
    } catch(e) {
        console.log('FK Error or already exists', e.message);
    }
    process.exit(0);
}
alterDb();
