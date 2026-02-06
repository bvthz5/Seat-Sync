import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateSamplePrograms = () => {
    const sampleData = [
        { ProgramCode: 'BTECH-CS', ProgramName: 'Bachelor of Technology in Computer Science', DepartmentCode: 'CS', DurationYears: 4 },
        { ProgramCode: 'BTECH-ME', ProgramName: 'Bachelor of Technology in Mechanical Engineering', DepartmentCode: 'ME', DurationYears: 4 },
        { ProgramCode: 'BTECH-EC', ProgramName: 'Bachelor of Technology in Electronics and Communication', DepartmentCode: 'EC', DurationYears: 4 },
        { ProgramCode: 'BTECH-CE', ProgramName: 'Bachelor of Technology in Civil Engineering', DepartmentCode: 'CE', DurationYears: 4 },
        { ProgramCode: 'BTECH-EE', ProgramName: 'Bachelor of Technology in Electrical Engineering', DepartmentCode: 'EE', DurationYears: 4 },
        { ProgramCode: 'BTECH-AI', ProgramName: 'Bachelor of Technology in AI and Data Science', DepartmentCode: 'AI', DurationYears: 4 },
        { ProgramCode: 'MCA', ProgramName: 'Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 2 },
        { ProgramCode: 'MCAI', ProgramName: 'Integrated Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 5 },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    ws['!cols'] = [
        { wch: 15 }, // ProgramCode
        { wch: 60 }, // ProgramName
        { wch: 15 }, // DepartmentCode
        { wch: 12 }  // DurationYears
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Programs');

    const outputPath = join(__dirname, '..', '..', 'sample_programs.xlsx');
    XLSX.writeFile(wb, outputPath);

    console.log(`✅ Sample programs file created at: ${outputPath}`);
};

generateSamplePrograms();
