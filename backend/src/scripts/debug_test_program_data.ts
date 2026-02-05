
import { sequelize, connectDB } from '../config/database.js';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';

async function testDB() {
    try {
        console.log("Connecting...");
        await connectDB();

        console.log("\n--- DEPARTMENTS ---");
        const depts = await Department.findAll();
        depts.forEach((d: any) => {
            console.log(`ID: ${d.DepartmentID} | Code: ${d.DepartmentCode} | Name: ${d.DepartmentName}`);
        });

        console.log("\n--- PROGRAMS ---");
        const programs = await Program.findAll();
        programs.forEach((p: any) => {
            console.log(`ID: ${p.ProgramID} | Code: ${p.ProgramCode} | Name: ${p.ProgramName} | DeptID: ${p.DepartmentID}`);
        });

        process.exit(0);
    } catch (error: any) {
        console.error("DB Test Failed:", error);
        process.exit(1);
    }
}

testDB();
