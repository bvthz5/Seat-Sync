import { Student } from "../src/models/Student.js";
import { User } from "../src/models/User.js";
import { sequelize } from "../src/config/database.js";

async function findStudent() {
    try {
        await sequelize.authenticate();
        const student = await Student.findOne({
            where: { RegisterNumber: 'SJC25MCA-2001' },
            include: [User]
        });
        if (student) {
            console.log("STUDENT FOUND:");
            console.log(JSON.stringify(student.toJSON(), null, 2));
        } else {
            console.log("STUDENT NOT FOUND BY REG NO");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

findStudent();
