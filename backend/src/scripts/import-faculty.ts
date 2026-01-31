import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, sequelize } from "../config/database.js";
import { Department } from "../models/Department.js";
import { Faculty } from "../models/Faculty.js";

// Helper for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, "../../../facultydata/mca/faculty.csv");

const importFaculty = async () => {
    try {
        await connectDB();
        console.log("Connected to database...");

        // Sync table
        console.log("Syncing Faculty table...");
        await Faculty.sync({ alter: true });

        // Find MCA Department (CA)
        const departmentCode = "CA";
        const department = await Department.findOne({
            where: { DepartmentCode: departmentCode },
            order: [['DepartmentID', 'ASC']],
        });

        if (!department) {
            console.error(`Department with code '${departmentCode}' not found!`);
            process.exit(1);
        }

        console.log(`Found Department: ${department.DepartmentName} (ID: ${department.DepartmentID})`);

        // Read CSV
        if (!fs.existsSync(CSV_PATH)) {
            console.error(`CSV file not found at: ${CSV_PATH}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
        const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

        // Header
        const dataLines = lines.slice(1);

        console.log(`Found ${dataLines.length} faculty entries to process.`);

        let createdCount = 0;
        let updatedCount = 0;

        for (const line of dataLines) {
            const parts = line.split(",");

            if (parts.length < 5) {
                console.warn(`Skipping invalid line: ${line}`);
                continue;
            }

            const name = parts[0].trim();
            const designation = parts[2].trim();
            const imageUrl = parts[4].trim();

            // Explicit find (with order) + create/update
            let faculty = await Faculty.findOne({
                where: {
                    Name: name,
                    DepartmentID: department.DepartmentID
                },
                order: [['FacultyID', 'ASC']],
            });

            if (!faculty) {
                // Create
                faculty = await Faculty.create({
                    Name: name,
                    Designation: designation,
                    ProfileImageURL: imageUrl,
                    DepartmentID: department.DepartmentID,
                });
                createdCount++;
                console.log(`Created: ${name}`);
            } else {
                // Update
                if (faculty.Designation !== designation || faculty.ProfileImageURL !== imageUrl) {
                    faculty.Designation = designation;
                    faculty.ProfileImageURL = imageUrl;
                    await faculty.save();
                    updatedCount++;
                    console.log(`Updated: ${name}`);
                }
            }
        }

        console.log(`\nImport Complete!`);
        console.log(`Created: ${createdCount}`);
        console.log(`Updated: ${updatedCount}`);

        process.exit(0);
    } catch (error) {
        console.error("Error importing faculty:", error);
        process.exit(1);
    }
};

importFaculty();
