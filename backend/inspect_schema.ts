
import { sequelize } from './src/config/database.js';

async function inspectTable() {
    try {
        await sequelize.authenticate();
        const [results] = await sequelize.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Subjects'");
        console.log('--- SUBJECTS COLUMNS ---');
        console.log(results.map(r => r.COLUMN_NAME));

        const [resultsDepts] = await sequelize.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Departments'");
        console.log('--- DEPARTMENTS COLUMNS ---');
        console.log(resultsDepts.map(r => (r as any).COLUMN_NAME));

        const [resultsExams] = await sequelize.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Exams'");
        console.log('--- EXAMS COLUMNS ---');
        console.log(resultsExams.map(r => (r as any).COLUMN_NAME));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

inspectTable();
