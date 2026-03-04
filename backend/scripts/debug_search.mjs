import { sequelize } from '../dist/config/database.js';
import { QueryTypes } from 'sequelize';

await sequelize.authenticate();

// Show sample students
const students = await sequelize.query(
    `SELECT TOP 5 s.StudentID, s.RegisterNumber, ISNULL(u.FullName, s.RegisterNumber) AS FullName
     FROM Students s LEFT JOIN Users u ON s.UserID = u.UserID`,
    { type: QueryTypes.SELECT }
);
console.log('Sample students:', JSON.stringify(students, null, 2));

// Try a search like the endpoint does
const term = '21CS'; // change this to match your actual data
const safeTerm = term.replace(/'/g, "''");
const matched = await sequelize.query(
    `SELECT s.StudentID, s.RegisterNumber, ISNULL(u.FullName, s.RegisterNumber) AS FullName
     FROM Students s LEFT JOIN Users u ON s.UserID = u.UserID
     WHERE s.RegisterNumber LIKE N'%${safeTerm}%'
        OR ISNULL(u.FullName, '') LIKE N'%${safeTerm}%'`,
    { type: QueryTypes.SELECT }
);
console.log(`Search for "${term}" (${matched.length} results):`, JSON.stringify(matched.slice(0,3), null, 2));

process.exit(0);
