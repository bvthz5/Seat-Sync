import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateSampleDepartments = () => {
    const sampleData = [
        { DepartmentCode: 'CS', DepartmentName: 'Computer Science and Engineering' },
        { DepartmentCode: 'ME', DepartmentName: 'Mechanical Engineering' },
        { DepartmentCode: 'EC', DepartmentName: 'Electronics and Communication Engineering' },
        { DepartmentCode: 'CE', DepartmentName: 'Civil Engineering' },
        { DepartmentCode: 'EE', DepartmentName: 'Electrical and Electronics Engineering' },
        { DepartmentCode: 'AI', DepartmentName: 'Artificial Intelligence and Data Science' },
        { DepartmentCode: 'CA', DepartmentName: 'Computer Applications' },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);

    ws['!cols'] = [
        { wch: 15 }, // DepartmentCode
        { wch: 50 }  // DepartmentName
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Departments');

    const outputPath = join(__dirname, '..', '..', 'sample_departments.xlsx');
    XLSX.writeFile(wb, outputPath);

    console.log(`✅ Sample departments file created at: ${outputPath}`);
};

generateSampleDepartments();
