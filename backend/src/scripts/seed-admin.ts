import { sequelize, connectDB } from "../config/database.js";
import { User } from "../models/User.js";
import bcrypt from "bcrypt";

const seedAdmin = async () => {
    try {
        await connectDB();
        console.log("Connected to database...");

        const adminEmail = "root.seatsync@gmail.com";
        const adminPassword = "Admin@123";

        // Check if admin exists (old or new email)
        // We might want to remove the old admin 'admin@example.com' if it exists, or just ensure the new one exists.
        // Let's check for the new email first.
        let admin = await User.findOne({ where: { Email: adminEmail } });

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        if (admin) {
            console.log(`User ${adminEmail} exists. Updating password...`);
            admin.PasswordHash = hashedPassword;
            admin.IsActive = true;
            admin.IsRootAdmin = true;
            await admin.save();
        } else {
            console.log(`Creating user ${adminEmail}...`);
            await User.create({
                Email: adminEmail,
                PasswordHash: hashedPassword,
                FullName: "Root Admin",
                Role: "exam_admin",
                IsRootAdmin: true,
                IsActive: true,
                CreatedAt: new Date(),
            });
        }

        // Optional: Remove the old temp admin if it was just created
        const oldAdmin = await User.findOne({ where: { Email: "admin@example.com" } });
        if (oldAdmin) {
            console.log("Removing temporary admin 'admin@example.com'...");
            await oldAdmin.destroy();
        }

        console.log("Admin credentials updated:");
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();
