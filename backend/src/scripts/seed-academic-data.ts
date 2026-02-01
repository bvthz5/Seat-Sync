import { Program } from "../models/Program.js";
import { Semester } from "../models/Semester.js";
import { connectDB, sequelize } from "../config/database.js";

const programs = [
    { name: "Bachelor of Technology", code: "BTECH", duration: 4, semesters: 8 },
    { name: "Master of Computer Applications", code: "MCA", duration: 2, semesters: 4 },
    { name: "Master of Business Administration", code: "MBA", duration: 2, semesters: 4 },
    { name: "Master of Technology", code: "MTECH", duration: 2, semesters: 4 },
];

const main = async () => {
    try {
        await connectDB();
        console.log("Connected to database...");

        for (const prog of programs) {
            const [program, created] = await Program.findOrCreate({
                where: { ProgramName: prog.name },
                defaults: {
                    ProgramName: prog.name,
                    ProgramCode: prog.code,
                    DurationYears: prog.duration,
                },
            });

            if (created) {
                console.log(`Created Program: ${prog.name}`);

                // Also create semesters for this program
                for (let i = 1; i <= prog.semesters; i++) {
                    await Semester.create({
                        SemesterNumber: i,
                        SemesterName: `Semester ${i}`,
                        ProgramID: program.ProgramID
                    });
                }
                console.log(`  -> Created ${prog.semesters} semesters.`);
            } else {
                console.log(`Program Exists: ${prog.name}`);
            }
        }

        console.log("Academic data seeding complete.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding academic data:", error);
        process.exit(1);
    }
};

main();
