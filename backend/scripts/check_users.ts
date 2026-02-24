import { User } from "../src/models/User.js";
import { sequelize } from "../src/config/database.js";
import { Op } from "sequelize";

async function run() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({
            where: {
                Role: { [Op.in]: ['invigilator', 'exam_admin'] }
            }
        });
        console.log("Admins and Invigilators:");
        console.log(users.map(u => ({ Email: u.Email, Role: u.Role, IsActive: u.IsActive })));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
