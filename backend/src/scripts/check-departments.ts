import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/database.js";
import { Department } from "../models/Department.js";

// Helper for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join("=").trim();
        }
    });
}

const checkDepartments = async () => {
    try {
        await connectDB();
        const departments = await Department.findAll();
        console.log("Existing Departments:");
        departments.forEach(dept => {
            console.log(`- ${dept.DepartmentName} (Code: ${dept.DepartmentCode}, ID: ${dept.DepartmentID})`);
        });
        process.exit(0);
    } catch (error) {
        console.error("Error checking departments:", error);
        process.exit(1);
    }
};

checkDepartments();
