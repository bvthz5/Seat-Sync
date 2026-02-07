import { sequelize } from '../config/database.js';

async function checkExamsSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MSSQL');

        const [examsCols] = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Exams'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n=== Exams Table Schema ===');
        examsCols.forEach((col: any) => {
            console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        const [seriesCols] = await sequelize.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'ExamSeries'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n=== ExamSeries Table Schema ===');
        seriesCols.forEach((col: any) => {
            console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

checkExamsSchema();
