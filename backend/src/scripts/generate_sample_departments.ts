import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Sample departments based on register number patterns
const departments = [
    { DepartmentCode: 'CS', DepartmentName: 'Computer Science and Engineering' },
    { DepartmentCode: 'ME', DepartmentName: 'Mechanical Engineering' },
    { DepartmentCode: 'EC', DepartmentName: 'Electronics and Communication Engineering' },
    { DepartmentCode: 'ECE', DepartmentName: 'Electronics and Communication Engineering' },
    { DepartmentCode: 'CA', DepartmentName: 'Computer Applications' },
    { DepartmentCode: 'EE', DepartmentName: 'Electrical and Electronics Engineering' },
    { DepartmentCode: 'CE', DepartmentName: 'Civil Engineering' },
];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(departments);

// Set column widths
ws['!cols'] = [
    { wch: 15 }, // DepartmentCode
    { wch: 50 }  // DepartmentName
];

XLSX.utils.book_append_sheet(wb, ws, 'Departments');

// Write file
const outputPath = path.resolve('sample_departments.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Sample departments Excel created: ${outputPath}`);
console.log(`📊 Contains ${departments.length} departments`);
