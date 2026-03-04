import { sequelize } from '../src/config/database.js';
import { QueryTypes } from 'sequelize';

await sequelize.authenticate();

const count = await sequelize.query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM Students',
    { type: QueryTypes.SELECT }
);
console.log('Total students in DB:', count[0]);

const rows = await sequelize.query<{ RegisterNumber: string }>(
    'SELECT TOP 10 RegisterNumber FROM Students ORDER BY StudentID',
    { type: QueryTypes.SELECT }
);
console.log('Sample register numbers from DB:');
rows.forEach(r => console.log(JSON.stringify(r.RegisterNumber), '  length:', r.RegisterNumber.length));

// Check if any match the Excel sample format
const excelSamples = ['21CS001', '21CS002', '22CS001'];
for (const rn of excelSamples) {
    const found = await sequelize.query<{ RegisterNumber: string }>(
        `SELECT RegisterNumber FROM Students WHERE RegisterNumber = :rn`,
        { replacements: { rn }, type: QueryTypes.SELECT }
    );
    console.log(`Exact match for "${rn}":`, found.length > 0 ? found[0] : 'NOT FOUND');
    const fuzzy = await sequelize.query<{ RegisterNumber: string }>(
        `SELECT TOP 3 RegisterNumber FROM Students WHERE RegisterNumber LIKE :pattern`,
        { replacements: { pattern: `%${rn}%` }, type: QueryTypes.SELECT }
    );
    console.log(`LIKE match for "%${rn}%":`, fuzzy);
}

await sequelize.close();
process.exit(0);
