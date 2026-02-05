import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Sample programs based on common engineering programs
const programs = [
    // B.Tech Programs
    { ProgramCode: 'BTECH-CS', ProgramName: 'Bachelor of Technology in Computer Science', DepartmentCode: 'CS', DurationYears: 4 },
    { ProgramCode: 'BTECH-ME', ProgramName: 'Bachelor of Technology in Mechanical Engineering', DepartmentCode: 'ME', DurationYears: 4 },
    { ProgramCode: 'BTECH-EC', ProgramName: 'Bachelor of Technology in Electronics and Communication', DepartmentCode: 'EC', DurationYears: 4 },
    { ProgramCode: 'BTECH-EE', ProgramName: 'Bachelor of Technology in Electrical Engineering', DepartmentCode: 'EE', DurationYears: 4 },
    { ProgramCode: 'BTECH-CE', ProgramName: 'Bachelor of Technology in Civil Engineering', DepartmentCode: 'CE', DurationYears: 4 },

    // MCA Programs
    { ProgramCode: 'MCA', ProgramName: 'Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 2 },
    { ProgramCode: 'MCAI', ProgramName: 'Integrated Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 5 },

    // M.Tech Programs
    { ProgramCode: 'MTECH-CS', ProgramName: 'Master of Technology in Computer Science', DepartmentCode: 'CS', DurationYears: 2 },
    { ProgramCode: 'MTECH-ME', ProgramName: 'Master of Technology in Mechanical Engineering', DepartmentCode: 'ME', DurationYears: 2 },
];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(programs);

// Set column widths
ws['!cols'] = [
    { wch: 15 }, // ProgramCode
    { wch: 60 }, // ProgramName
    { wch: 15 }, // DepartmentCode
    { wch: 12 }  // DurationYears
];

XLSX.utils.book_append_sheet(wb, ws, 'Programs');

// Write file
const outputPath = path.resolve('sample_programs.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Sample programs Excel created: ${outputPath}`);
console.log(`📊 Contains ${programs.length} programs`);
