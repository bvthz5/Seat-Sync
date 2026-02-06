import { sequelize } from '../config/database.js';

async function checkTables() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // Get all tables
        const [results] = await sequelize.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        console.log('\n=== All Tables in Database ===');
        results.forEach((row: any) => {
            console.log(`- ${row.TABLE_NAME}`);
        });

        // Check if Subjects table exists
        const hasSubjects = results.some((row: any) => row.TABLE_NAME === 'Subjects');
        const hasSemesters = results.some((row: any) => row.TABLE_NAME === 'Semesters');

        console.log('\n=== Table Check ===');
        console.log(`Subjects table exists: ${hasSubjects}`);
        console.log(`Semesters table exists: ${hasSemesters}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkTables();
