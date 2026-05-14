import { sequelize } from "../backend/src/config/database.js";
import { User } from "../backend/src/models/User.js";

async function checkUsers() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        const users = await User.findAll({
            attributes: ['UserID', 'Email', 'Role', 'IsActive', 'IsRootAdmin']
        });
        console.log('Users in database:');
        console.table(users.map(u => u.toJSON()));
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkUsers();
