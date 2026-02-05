
import * as XLSX from 'xlsx';
import path from 'path';

// Config
const TOTAL_STUDENTS = 478;
const FILE_NAME = 'dummy_students_import.xlsx';
const OUTPUT_PATH = path.resolve('../../', FILE_NAME); // Save to Desktop (Parent of Seat-Sync?) No, User Root is Desktop/Seat-Sync. 
// User workspace: c:\Users\hp\Desktop\Seat-Sync
// Let's save to c:\Users\hp\Desktop\Seat-Sync\dummy_students_import.xlsx for easy access.

const FIRST_NAMES = [
    "Adithya", "Arjun", "Anjali", "Abhinav", "Aswiny", "Athira", "Ashwin", "Akhil", "Amal", "Amrutha",
    "Bipin", "Ben", "Basil", "Bhavana", "Chithra", "Cyril", "Deepak", "Devika", "Divya", "Dona",
    "Ebin", "Eldho", "Fathima", "Gokul", "Gopika", "Hari", "Haritha", "Ijas", "Jithin", "Joel",
    "Jeswin", "Jyothi", "Kavya", "Kiran", "Lakshmi", "Megha", "Manu", "Midhun", "Nandana", "Nikhil",
    "Nithin", "Parvathy", "Pranav", "Rahul", "Reshma", "Riya", "Sachin", "Sandra", "Shilpa", "Sneha",
    "Sooraj", "Sreehari", "Swathy", "Tom", "Unni", "Varun", "Vimal", "Vishnu", "Vygha", "Zain"
];

const LAST_NAMES = [
    "Nair", "Menon", "Pillai", "Kumar", "Raj", "Thomas", "Joseph", "Mathew", "George", "Varghese",
    "Abraham", "Jacob", "Philip", "Paul", "Krishna", "Dev", "Das", "Mohan", "Babu", "Suresh",
    "Ramesh", "Chandran", "Panicker", "Warrier", "Nambiar", "Kurian", "Zacharia", "Simon", "Chacko", "Alex"
];

const GROUPS = [
    { name: 'MCA 2024', program: 'Master of Computer Applications', code: 'MCA', year: 24, sem: 'S4', count: 120 },
    { name: 'MCA 2025', program: 'Master of Computer Applications', code: 'MCA', year: 25, sem: 'S2', count: 119 },
    { name: 'MCAI 2024', program: 'Integrated MCA', code: 'MCAI', year: 24, sem: 'S4', count: 120 },
    { name: 'MCAI 2025', program: 'Integrated MCA', code: 'MCAI', year: 25, sem: 'S2', count: 119 }
];

function getRandomName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${first} ${last}`;
}

function generateData() {
    const data: any[] = [];

    GROUPS.forEach(group => {
        for (let i = 1; i <= group.count; i++) {
            // Generate RegNo: SJC + Year + Code + 4digitNum
            // e.g. SJC24MCA2001
            // Pad number to 4 chars? Or just start from 2000? 
            // Previous errors showed SJC24MCA2001. Let's use 2000 base.
            const num = 2000 + i;
            const regNo = `SJC${group.year}${group.code}${num}`;

            data.push({
                'Register Number': regNo,
                'Name': getRandomName(),
                'Program': group.program,
                'Semester': group.sem
            });
        }
    });

    return data;
}

try {
    const students = generateData();
    const worksheet = XLSX.utils.json_to_sheet(students);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    // Adjust column widths
    const wscols = [
        { wch: 20 }, // Reg No
        { wch: 25 }, // Name
        { wch: 35 }, // Program
        { wch: 10 }  // Semester
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, FILE_NAME);
    console.log(`Successfully generated ${FILE_NAME} with ${students.length} records.`);
    console.log(`Path: ${path.resolve(FILE_NAME)}`);
} catch (err) {
    console.error("Error generating Excel:", err);
}
