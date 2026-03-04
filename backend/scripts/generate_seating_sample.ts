/**
 * Generates a sample seating Excel file using REAL register numbers from the DB.
 * Output: backend/sample_seating_real.xlsx
 */
import { sequelize } from '../src/config/database.js';
import { QueryTypes } from 'sequelize';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await sequelize.authenticate();

const students = await sequelize.query<{ RegisterNumber: string; Name: string }>(
    `SELECT TOP 500 s.RegisterNumber,
            COALESCE(u.FullName, 'Student') AS Name
     FROM Students s
     LEFT JOIN Users u ON u.UserID = s.UserID
     ORDER BY s.StudentID`,
    { type: QueryTypes.SELECT }
);

console.log(`Fetched ${students.length} students from DB`);
if (students.length === 0) {
    console.error('No students found in DB!');
    process.exit(1);
}

// Assign alternating L / R sides
const rows = students.map((s, i) => ({
    RegisterNumber: s.RegisterNumber,
    Name: (s as any).Name?.trim() || 'Student',
    Side: i % 2 === 0 ? 'L' : 'R'
}));

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'Seating');

const outPath = path.resolve(__dirname, '../sample_seating_real.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`Generated: ${outPath}`);
console.log('Sample rows:', JSON.stringify(rows.slice(0, 5), null, 2));

await sequelize.close();
process.exit(0);
