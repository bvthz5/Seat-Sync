import { sequelize } from "./src/config/database.js";
import { User } from "./src/models/User.js";

async function checkInvigilators() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        const invigilators = await User.findAll({
            where: { Role: 'invigilator' },
            attributes: ['UserID', 'Email', 'Role', 'IsActive', 'IsActivated'],
            limit: 10
        });
        console.log('Invigilators in database (limit 10):');
        console.table(invigilators.map(u => u.toJSON()));
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkInvigilators();
