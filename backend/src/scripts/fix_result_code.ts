
import { sequelize, connectDB } from '../config/database.js';
import { Program } from '../models/Program.js';

async function updateCode() {
    try {
        console.log("Connecting...");
        await connectDB();

        // Find the program with code IMCA and update to MCAI
        const prog = await Program.findOne({ where: { ProgramCode: 'IMCA' } });
        if (prog) {
            console.log(`Updating Program '${prog.ProgramName}' Code from IMCA to MCAI...`);
            prog.ProgramCode = 'MCAI';
            await prog.save();
            console.log("Updated successfully.");
        } else {
            // Check if already MCAI
            const prog2 = await Program.findOne({ where: { ProgramCode: 'MCAI' } });
            if (prog2) {
                console.log("Program is already MCAI.");
            } else {
                console.log("Program IMCA not found.");
            }
        }

        process.exit(0);
    } catch (error: any) {
        console.error("Update Failed:", error);
        process.exit(1);
    }
}

updateCode();
