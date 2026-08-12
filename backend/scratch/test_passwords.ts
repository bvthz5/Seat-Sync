import bcrypt from "bcrypt";
import bcryptjs from "bcryptjs";
import { User } from "../src/models/User.js";
import { sequelize } from "../src/config/database.js";

async function testPasswords() {
    try {
        await sequelize.authenticate();
        const admin = await User.findOne({ where: { Email: 'root.seatsync@gmail.com' } });
        if (admin) {
            const matchBcrypt = await bcrypt.compare('Admin@123', admin.PasswordHash);
            const matchBcryptJS = await bcryptjs.compare('Admin@123', admin.PasswordHash);
            console.log("Admin (root.seatsync@gmail.com) hash:", admin.PasswordHash);
            console.log("Match with bcrypt (native):", matchBcrypt);
            console.log("Match with bcryptjs:", matchBcryptJS);
        }

        const invigilator = await User.findOne({ where: { Role: 'invigilator' } });
        if (invigilator) {
            console.log(`\nInvigilator (${invigilator.Email}) hash:`, invigilator.PasswordHash);
            const matchBcrypt = await bcrypt.compare('Sjcet@123', invigilator.PasswordHash);
            const matchBcryptJS = await bcryptjs.compare('Sjcet@123', invigilator.PasswordHash);
            console.log("Match with bcrypt (native):", matchBcrypt);
            console.log("Match with bcryptjs:", matchBcryptJS);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

testPasswords();
