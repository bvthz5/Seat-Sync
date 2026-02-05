import { sequelize, connectDB } from '../config/database.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';

async function checkUserNames() {
    try {
        console.log("Connecting...");
        await connectDB();

        // Get first 5 students with their User info
        const students = await Student.findAll({
            limit: 5,
            include: [{
                model: User,
                attributes: ['UserID', 'Email', 'FullName']
            }],
            order: [['StudentID', 'ASC']]
        });

        console.log("\n=== First 5 Students ===");
        students.forEach((s: any) => {
            console.log(`RegNo: ${s.RegisterNumber}`);
            console.log(`  UserID: ${s.UserID}`);
            console.log(`  User.Email: ${s.User?.Email}`);
            console.log(`  User.FullName: ${s.User?.FullName || 'NULL/MISSING'}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error: any) {
        console.error("Check Failed:", error);
        process.exit(1);
    }
}

checkUserNames();
