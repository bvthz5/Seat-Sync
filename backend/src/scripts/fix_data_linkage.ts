
import { sequelize, connectDB } from '../config/database.js';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';

async function fixData() {
    try {
        console.log("Connecting...");
        await connectDB();

        // 1. Fix MCA -> CA Linkage
        const mcaProgram = await Program.findOne({ where: { ProgramCode: 'MCA' } });
        const caDept = await Department.findOne({ where: { DepartmentCode: 'CA' } });

        if (mcaProgram && caDept) {
            console.log(`Linking Program '${mcaProgram.ProgramName}' to Department '${caDept.DepartmentName}'...`);
            mcaProgram.DepartmentID = caDept.DepartmentID;
            await mcaProgram.save();
            console.log("Linkage Saved!");
        } else {
            console.log("Could not find MCA Program or CA Department to link.");
        }

        // 2. Fix B.Tech -> CSE (Temporary default? Or leave as is?)
        // The issue is that B.Tech is generic. The Excel sheet should specifies "B.Tech CSE". 
        // If the Excel just says "B.Tech", we can't really know. 
        // But for this specific user request, fixing MCA is the priority.

        process.exit(0);
    } catch (error: any) {
        console.error("Fix Data Failed:", error);
        process.exit(1);
    }
}

fixData();
