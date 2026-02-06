import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateComprehensivePrograms = () => {
    // Based on the departments: CS, ME, EC, CE, EE, AI, CA
    const programsData = [
        // Computer Science and Engineering (CS)
        { ProgramCode: 'BTECH-CS', ProgramName: 'Bachelor of Technology in Computer Science and Engineering', DepartmentCode: 'CS', DurationYears: 4 },
        { ProgramCode: 'MTECH-CS', ProgramName: 'Master of Technology in Computer Science and Engineering', DepartmentCode: 'CS', DurationYears: 2 },
        { ProgramCode: 'MTECH-CSE-AI', ProgramName: 'M.Tech in Computer Science and Engineering (AI & ML)', DepartmentCode: 'CS', DurationYears: 2 },

        // Mechanical Engineering (ME)
        { ProgramCode: 'BTECH-ME', ProgramName: 'Bachelor of Technology in Mechanical Engineering', DepartmentCode: 'ME', DurationYears: 4 },
        { ProgramCode: 'MTECH-ME', ProgramName: 'Master of Technology in Mechanical Engineering', DepartmentCode: 'ME', DurationYears: 2 },
        { ProgramCode: 'MTECH-TD', ProgramName: 'M.Tech in Tool Design', DepartmentCode: 'ME', DurationYears: 2 },

        // Electronics and Communication Engineering (EC)
        { ProgramCode: 'BTECH-EC', ProgramName: 'Bachelor of Technology in Electronics and Communication Engineering', DepartmentCode: 'EC', DurationYears: 4 },
        { ProgramCode: 'MTECH-EC', ProgramName: 'Master of Technology in Electronics and Communication Engineering', DepartmentCode: 'EC', DurationYears: 2 },
        { ProgramCode: 'MTECH-VLSI', ProgramName: 'M.Tech in VLSI Design', DepartmentCode: 'EC', DurationYears: 2 },

        // Civil Engineering (CE)
        { ProgramCode: 'BTECH-CE', ProgramName: 'Bachelor of Technology in Civil Engineering', DepartmentCode: 'CE', DurationYears: 4 },
        { ProgramCode: 'MTECH-CE', ProgramName: 'Master of Technology in Civil Engineering', DepartmentCode: 'CE', DurationYears: 2 },
        { ProgramCode: 'MTECH-SE', ProgramName: 'M.Tech in Structural Engineering', DepartmentCode: 'CE', DurationYears: 2 },

        // Electrical and Electronics Engineering (EE)
        { ProgramCode: 'BTECH-EE', ProgramName: 'Bachelor of Technology in Electrical and Electronics Engineering', DepartmentCode: 'EE', DurationYears: 4 },
        { ProgramCode: 'MTECH-EE', ProgramName: 'Master of Technology in Electrical and Electronics Engineering', DepartmentCode: 'EE', DurationYears: 2 },
        { ProgramCode: 'MTECH-PS', ProgramName: 'M.Tech in Power Systems', DepartmentCode: 'EE', DurationYears: 2 },

        // Artificial Intelligence and Data Science (AI)
        { ProgramCode: 'BTECH-AI', ProgramName: 'Bachelor of Technology in Artificial Intelligence and Data Science', DepartmentCode: 'AI', DurationYears: 4 },
        { ProgramCode: 'BTECH-DS', ProgramName: 'Bachelor of Technology in Data Science', DepartmentCode: 'AI', DurationYears: 4 },
        { ProgramCode: 'MTECH-AI', ProgramName: 'Master of Technology in Artificial Intelligence', DepartmentCode: 'AI', DurationYears: 2 },

        // Computer Applications (CA)
        { ProgramCode: 'MCA', ProgramName: 'Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 2 },
        { ProgramCode: 'MCA-I', ProgramName: 'Integrated Master of Computer Applications', DepartmentCode: 'CA', DurationYears: 5 },
        { ProgramCode: 'BCA', ProgramName: 'Bachelor of Computer Applications', DepartmentCode: 'CA', DurationYears: 3 },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(programsData);

    // Set column widths for better readability
    ws['!cols'] = [
        { wch: 18 }, // ProgramCode
        { wch: 75 }, // ProgramName
        { wch: 18 }, // DepartmentCode
        { wch: 15 }  // DurationYears
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Programs');

    const outputPath = join(__dirname, '..', '..', 'comprehensive_programs.xlsx');
    XLSX.writeFile(wb, outputPath);

    console.log(`✅ Comprehensive programs file created at: ${outputPath}`);
    console.log(`📊 Total programs: ${programsData.length}`);
    console.log(`🏛️  Departments covered: CS, ME, EC, CE, EE, AI, CA`);
};

generateComprehensivePrograms();
