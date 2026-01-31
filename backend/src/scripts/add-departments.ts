import { Department } from "../models/Department.js";
import { connectDB, sequelize } from "../config/database.js";

const departments = [
    { name: "Artificial Intelligence & Data Science", code: "AI&DS" },
    { name: "Civil Engineering", code: "CIVIL" },
    { name: "Computer Science & Engineering", code: "CSE" },
    { name: "Computer Science & Engineering (Cyber Security)", code: "CSE-CS" },
    { name: "Computer Science & Engineering (Artificial Intelligence)", code: "CSE-AI" },
    { name: "Electronics & Communication Engineering", code: "ECE" },
    { name: "Electronics & Computer Engineering", code: "ECM" },
    { name: "Electrical & Electronics Engineering", code: "EEE" },
    { name: "Mechanical Engineering", code: "MECH" },
    { name: "Computer Applications", code: "CA" },
    { name: "Masters in Business Administration", code: "MBA" },
    { name: "Science & Humanities Department", code: "S&H" },
];

const main = async () => {
    try {
        await connectDB();
        console.log("Connected to database...");

        for (const dept of departments) {
            const [department, created] = await Department.findOrCreate({
                where: { DepartmentCode: dept.code },
                defaults: {
                    DepartmentName: dept.name,
                    DepartmentCode: dept.code,
                },
            });

            if (created) {
                console.log(`Created: ${dept.name} (${dept.code})`);
            } else {
                console.log(`Exists: ${dept.name} (${dept.code})`);

                // Update name if it differs (optional, but good for synchronization)
                if (department.DepartmentName !== dept.name) {
                    department.DepartmentName = dept.name;
                    await department.save();
                    console.log(`  -> Updated name to: ${dept.name}`);
                }
            }
        }

        console.log("Department population complete.");
        process.exit(0);
    } catch (error) {
        console.error("Error populating departments:", error);
        process.exit(1);
    }
};

main();
