
import { sequelize } from './src/config/database.js';
import { Department } from './src/models/Department.js';

async function list() {
    try {
        await sequelize.authenticate();
        const depts = await Department.findAll();
        console.log('--- DEPARTMENTS ---');
        depts.forEach(d => {
            console.log(`ID: ${d.DepartmentID}, Code: ${d.DepartmentCode}`);
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

list();
