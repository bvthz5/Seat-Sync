import { User } from "../src/models/User.js";
import { Student } from "../src/models/Student.js";
import { sequelize } from "../src/config/database.js";

async function findConflictingUser() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({
            where: { Email: 'sjc25mca-2001@student.local' },
            include: [Student]
        });
        if (user) {
            console.log("USER FOUND:");
            console.log(JSON.stringify(user.toJSON(), null, 2));
        } else {
            console.log("USER NOT FOUND IN DB");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

findConflictingUser();
