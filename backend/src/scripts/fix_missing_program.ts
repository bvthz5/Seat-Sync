
import { sequelize, connectDB } from '../config/database.js';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';

async function fixMissingProgram() {
    try {
        console.log("Connecting...");
        await connectDB();

        // 1. Find CA Dept
        const caDept = await Department.findOne({ where: { DepartmentCode: 'CA' } });

        if (!caDept) {
            console.error("Critical Error: 'CA' Department not found!");
            process.exit(1);
        }

        // 2. Check if Integrated MCA exists
        let imcaProgram = await Program.findOne({ where: { ProgramCode: 'IMCA' } }); // Assuming IMCA as code

        if (!imcaProgram) {
            console.log("Creating 'Integrated Master of Computer Applications' program...");
            imcaProgram = await Program.create({
                ProgramName: 'Integrated Master of Computer Applications',
                ProgramCode: 'IMCA', // Standard code, can use 'MCA-I' if preferred
                DepartmentID: caDept.DepartmentID,
                DurationYears: 5,
                IsActive: true
            });
            console.log("Program Created.");
        } else {
            console.log("Program 'IMCA' already exists. Ensuring Department Link...");
            if (!imcaProgram.DepartmentID) {
                imcaProgram.DepartmentID = caDept.DepartmentID;
                await imcaProgram.save();
                console.log("Linkage Saved!");
            } else {
                console.log("Linkage already correct.");
            }
        }

        // 3. Also check for "Integrated MCA" name match just in case
        // The excel says "Integrated MCA"
        let imcaNameParams = await Program.findOne({ where: { ProgramName: 'Integrated MCA' } });
        if (!imcaNameParams && imcaProgram.ProgramName !== 'Integrated MCA') {
            // Create an alias entry? Or relying on "IMCA" code? 
            // The controller searches by Name OR Code. 
            // Controller logic: programCache.set(p.ProgramName.toUpperCase(), p);
            // So if we create "Integrated Master of Computer Applications", user excel must match EXACTLY or contain it?
            // Excel Row says: "Integrated MCA"
            // My DB create says: "Integrated Master of Computer Applications"
            // The match might FAIL unless I create it strictly as "Integrated MCA" OR add alias.
            // Let's create it as "Integrated Master of Computer Applications" but rely on my "SMART MATCH" logic?
            // Wait, my smart match logic in controller only does Dept inference. 
            // Program matching is strict Name or Code.

            // BETTER APPROACH: Update the existing creation to use the exact name causing error or add a synomym logic?
            // Since this is a one-off fix, I will create it with the Name from Excel "Integrated MCA" to be safe.
            // OR I can create "Integrated Master of Computer Applications" and rely on the user using the CODE "IMCA" in future?
            // No, let's stick to the Excel input to fix THIS import.
            console.log("Creating Alias/Exact Match Program 'Integrated MCA'...");
            await Program.create({
                ProgramName: 'Integrated MCA', // Exact match for Excel
                ProgramCode: 'IMCA-Short',
                DepartmentID: caDept.DepartmentID,
                DurationYears: 5,
                IsActive: true
            });
        }

        process.exit(0);
    } catch (error: any) {
        console.error("Fix Program Failed:", error);
        process.exit(1);
    }
}

fixMissingProgram();
