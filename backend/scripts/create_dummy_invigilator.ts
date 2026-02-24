import { User } from "../src/models/User.js";
import { AuthService } from "../src/services/auth.service.js";
import { sequelize } from "../src/config/database.js";

async function run() {
    try {
        await sequelize.authenticate();
        const email = "test@sjcetpalai.ac.in";
        const password = "Password@123";

        const existing = await User.findOne({ where: { Email: email } });
        if (existing) {
            console.log(`User already exists: ${email}`);
            await existing.update({ Role: "invigilator", IsActive: true });
            console.log("Updated to active invigilator.");
            process.exit(0);
        }

        const passwordHash = await AuthService.hashPassword(password);

        await User.create({
            Email: email,
            FullName: "Test Invigilator",
            PasswordHash: passwordHash,
            Role: "invigilator",
            IsActive: true,
            IsRootAdmin: false,
            CreatedAt: new Date()
        });

        console.log(`Created dummy invigilator account successfully:\nEmail: ${email}\nPassword: ${password}`);
    } catch (e) {
        console.error("Error creating dummy user:", e);
    } finally {
        process.exit(0);
    }
}

run();
