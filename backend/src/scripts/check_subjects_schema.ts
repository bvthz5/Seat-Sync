import { sequelize } from '../config/database.js';

async function checkSubjectsSchema() {
    try {
        await sequelize.authenticate();

        const [columns] = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Subjects'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n=== Subjects Table Schema ===');
        columns.forEach((col: any) => {
            console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkSubjectsSchema();
