
import { sequelize } from './src/config/database.js';
import { Semester } from './src/models/Semester.js';
import { AcademicYear } from './src/models/AcademicYear.js';
import { Department } from './src/models/Department.js';
import { Subject } from './src/models/Subject.js';

async function testSetup() {
    try {
        console.log('Testing connection...');
        await sequelize.authenticate();
        console.log('Connection OK');

        console.log('Checking Semester 1...');
        const s = await Semester.findByPk(1);
        console.log('Semester 1:', s ? 'Found' : 'MISSING');

        console.log('Checking AcademicYear count...');
        const ay = await AcademicYear.count();
        console.log('AcademicYears:', ay);

        console.log('Loading Departments...');
        const depts = await Department.findAll();
        console.log('Depts loaded:', depts.length);

        console.log('Loading Subjects...');
        const subjs = await Subject.findAll();
        console.log('Subjs loaded:', subjs.length);

        console.log('ALL SETUP STEPS SUCCESSFUL');
    } catch (err) {
        console.error('FATAL ERROR DURING SETUP SIMULATION:');
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

testSetup();
