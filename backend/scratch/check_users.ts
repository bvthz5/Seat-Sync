import { User } from "../src/models/User.js";
import { sequelize } from "../src/config/database.js";

async function checkUsers() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({
            attributes: ['UserID', 'Email', 'Role', 'IsActive', 'IsActivated', 'IsPasswordChanged']
        });
        console.log("USERS IN DATABASE:");
        console.table(users.map(u => u.toJSON()));
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

checkUsers();
