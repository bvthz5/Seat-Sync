import { User } from "../src/models/User.js";
import { sequelize } from "../src/config/database.js";
import { Op } from "sequelize";

async function checkInvigilators() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({
            where: { Role: 'invigilator' },
            attributes: ['UserID', 'Email', 'Role', 'IsActive', 'IsActivated', 'IsPasswordChanged']
        });
        console.log("INVIGILATORS IN DATABASE:");
        console.table(users.map(u => u.toJSON()));
        
        const admins = await User.findAll({
            where: { Role: { [Op.in]: ['exam_admin', 'root_admin', 'admin'] } },
            attributes: ['UserID', 'Email', 'Role', 'IsActive', 'IsActivated', 'IsPasswordChanged']
        });
        console.log("ADMINS IN DATABASE:");
        console.table(admins.map(u => u.toJSON()));
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

checkInvigilators();
