import { sequelize } from "./src/config/database.js";
import { User } from "./src/models/User.js";
import { Op } from "sequelize";

async function checkAdmins() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        const admins = await User.findAll({
            where: {
                Role: { [Op.in]: ['exam_admin', 'root_admin', 'admin'] }
            },
            attributes: ['UserID', 'Email', 'Role', 'IsActive', 'IsRootAdmin']
        });
        console.log('Admins in database:');
        console.table(admins.map(u => u.toJSON()));
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkAdmins();
