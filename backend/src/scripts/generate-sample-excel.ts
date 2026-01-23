import * as XLSX from 'xlsx';
import path from 'path';

const data = [
    {
        Name: "John Doe",
        Email: "john.doe@example.com",
        RegisterNumber: "REG001",
        DepartmentCode: "CSE",
        ProgramName: "B.Tech",
        SemesterNumber: 1,
        BatchYear: 2025
    },
    {
        Name: "Jane Smith",
        Email: "jane.smith@example.com",
        RegisterNumber: "REG002",
        DepartmentCode: "ECE",
        ProgramName: "B.Tech",
        SemesterNumber: 3,
        BatchYear: 2024
    }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

const outputPath = path.resolve('C:\\Users\\hp\\Desktop\\sample_students.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Sample Excel file created at: ${outputPath}`);
