import { Department } from "../models/Department.js";
import { Program } from "../models/Program.js";
import { Semester } from "../models/Semester.js";
import { connectDB, sequelize } from "../config/database.js";

const departments = [
    { name: 'Computer Science and Engineering', code: 'CSE' },
    { name: 'Electronics and Communication Engineering', code: 'ECE' },
    { name: 'Mechanical Engineering', code: 'MECH' },
    { name: 'Civil Engineering', code: 'CIVIL' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Electrical and Electronics Engineering', code: 'EEE' }
];

const seedMasterData = async () => {
    try {
        await connectDB();
        console.log("Database connected.");

        // 1. Seed Departments
        console.log("Seeding Departments...");
        for (const dept of departments) {
            await Department.findOrCreate({
                where: { DepartmentCode: dept.code },
                defaults: {
                    DepartmentName: dept.name,
                    DepartmentCode: dept.code
                }
            });
        }

        // 2. Seed Programs
        console.log("Seeding Programs...");
        const [program] = await Program.findOrCreate({
            where: { ProgramName: 'B.Tech' },
            defaults: {
                ProgramName: 'B.Tech',
                ProgramCode: 'BTECH',
                DurationYears: 4
            }
        });

        // 3. Seed Semesters
        console.log("Seeding Semesters...");
        for (let i = 1; i <= 8; i++) {
            await Semester.findOrCreate({
                where: {
                    SemesterNumber: i,
                    ProgramID: program.ProgramID
                },
                defaults: {
                    SemesterNumber: i,
                    SemesterName: `Semester ${i}`,
                    ProgramID: program.ProgramID
                }
            });
        }

        console.log("Master data seeded successfully!");

    } catch (error) {
        console.error("Error seeding master data:", error);
    } finally {
        await sequelize.close();
    }
};

seedMasterData();
