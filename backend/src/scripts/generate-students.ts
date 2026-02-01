import * as XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Gregory', 'Alexander', 'Frank', 'Patrick', 'Raymond', 'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle', 'Walter', 'Ethan', 'Jeremy', 'Harold', 'Keith', 'Christian', 'Roger', 'Noah', 'Gerald', 'Carl', 'Terry', 'Sean', 'Austin', 'Arthur', 'Lawrence', 'Jesse', 'Dylan', 'Bryan', 'Joe', 'Jordan', 'Billy', 'Bruce', 'Albert', 'Willie', 'Gabriel', 'Logan', 'Alan', 'Juan', 'Wayne', 'Roy', 'Ralph', 'Randy', 'Eugene', 'Vincent', 'Russell', 'Louis', 'Bobby', 'Philip', 'Johnny'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Foster', 'Bernal', 'Castro', 'Lara', 'Vega'];

const depts = [
    { code: "AI&DS" },
    { code: "CIVIL" },
    { code: "CSE" },
    { code: "ECE" },
    { code: "MECH" },
    { code: "CA" },
    { code: "MBA" }
];

const generateData = (count: number) => {
    const data = [];
    for (let i = 1; i <= count; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const fullName = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

        const dept = depts[Math.floor(Math.random() * depts.length)];

        // Logical mapping
        let programName = "Bachelor of Technology";
        let semesterLimit = 8;

        if (dept.code === 'CA') {
            programName = "Master of Computer Applications";
            semesterLimit = 4;
        } else if (dept.code === 'MBA') {
            programName = "Master of Business Administration";
            semesterLimit = 4;
        }

        const batchYear = 2021 + Math.floor(Math.random() * 4); // 2021 to 2024
        const semester = 1 + Math.floor(Math.random() * semesterLimit);

        const batchShort = batchYear.toString().substring(2);
        const regNo = `SJS${batchShort}${dept.code}${i.toString().padStart(3, '0')}`;

        data.push({
            'Name': fullName,
            'Email': email,
            'RegisterNumber': regNo,
            'DepartmentCode': dept.code,
            'ProgramName': programName,
            'SemesterNumber': semester,
            'BatchYear': batchYear
        });
    }
    return data;
};

const students = generateData(500);
const worksheet = XLSX.utils.json_to_sheet(students);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

const outputPath = path.resolve(__dirname, '../../students_500.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Successfully regenerated 500 students at: ${outputPath}`);
