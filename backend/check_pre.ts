
import { sequelize } from './src/config/database.js';
import { Semester } from './src/models/Semester.js';
import { AcademicYear } from './src/models/AcademicYear.js';

async function check() {
    try {
        await sequelize.authenticate();
        const s = await Semester.findByPk(1);
        const ayCount = await AcademicYear.count();
        console.log(`Semester 1: ${s ? 'Found' : 'MISSING'}`);
        console.log(`Academic Years: ${ayCount}`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

check();
