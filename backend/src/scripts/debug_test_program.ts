
import { sequelize, connectDB } from '../config/database.js';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';

async function testDB() {
    try {
        console.log("Connecting...");
        await connectDB();
        console.log("Connected and Schema Verified.");

        console.log("Fetching Programs...");
        const programs = await Program.findAll();
        console.log(`Programs found: ${programs.length}`);

        console.log("Fetching Departments...");
        const depts = await Department.findAll();
        console.log(`Departments found: ${depts.length}`);

        process.exit(0);
    } catch (error: any) {
        console.error("DB Test Failed:", error);
        console.error("Stack:", error.stack);
        process.exit(1);
    }
}

testDB();
