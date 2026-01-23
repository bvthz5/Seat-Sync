import * as XLSX from 'xlsx';
import path from 'path';

const departments = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT', 'EEE'];
const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
const programs = ['B.Tech'];
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const generateStudents = (count: number) => {
    const students = [];
    for (let i = 0; i < count; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const dept = departments[Math.floor(Math.random() * departments.length)];
        const semester = semesters[Math.floor(Math.random() * semesters.length)];

        // Batch year calculation approximation based on semester
        // If sem 1/2 -> 2025 batch (current first year)
        // If sem 3/4 -> 2024 batch
        // If sem 5/6 -> 2023 batch
        // If sem 7/8 -> 2022 batch
        const batchYear = 2026 - Math.ceil(semester / 2);

        students.push({
            Name: `${firstName} ${lastName}`,
            Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@seatsync.edu`,
            RegisterNumber: `REG${2025000 + i}`,
            DepartmentCode: dept,
            ProgramName: 'B.Tech',
            SemesterNumber: semester,
            BatchYear: batchYear
        });
    }
    return students;
};

const students = generateStudents(200);

const worksheet = XLSX.utils.json_to_sheet(students);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

const outputPath = path.resolve('C:\\Users\\hp\\Desktop\\large_student_dataset.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Generated ${students.length} students.`);
console.log(`File saved at: ${outputPath}`);
