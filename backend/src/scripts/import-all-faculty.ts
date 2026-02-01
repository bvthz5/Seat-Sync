import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, sequelize } from "../config/database.js";
import { Department } from "../models/Department.js";
import { Faculty } from "../models/Faculty.js";

// Helper for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.resolve(__dirname, "../../../facultydata/facultydataexceptmca.csv");

const DEPT_MAP: { [key: string]: string } = {
    "Artificial Intelligence and Data Science": "Artificial Intelligence & Data Science",
    "Computer Science and Engineering": "Computer Science & Engineering",
    "Electronics and Communication Engineering": "Electronics & Communication Engineering",
    "Electronics and Computer Engineering": "Electronics & Computer Engineering",
    "Electrical and Electronics Engineering": "Electrical & Electronics Engineering",
    "MBA": "Masters in Business Administration",
    "MCA": "Computer Applications"
};

const importAllFaculty = async () => {
    try {
        await connectDB();
        console.log("Connected to database...");

        // Sync table (connectDB already handles this)
        // console.log("Syncing Faculty table...");
        // await Faculty.sync({ alter: true });

        // Read CSV
        if (!fs.existsSync(CSV_PATH)) {
            console.error(`CSV file not found at: ${CSV_PATH}`);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
        const lines = fileContent.split("\n").filter((line) => line.trim() !== "");

        // Header: department_name,department_name_citation,faculty
        const dataLines = lines.slice(1);

        console.log(`Found ${dataLines.length} departments in CSV.`);

        let totalCreated = 0;
        let totalUpdated = 0;

        for (const line of dataLines) {
            // Since the faculty column contains JSON with commas, we need a smarter way to split
            // The format is: Name,Citation,"[{...}]"
            const firstComma = line.indexOf(",");
            const secondComma = line.indexOf(",", firstComma + 1);

            if (firstComma === -1 || secondComma === -1) {
                console.warn(`Skipping invalid line (missing commas): ${line.substring(0, 50)}...`);
                continue;
            }

            const rawDeptName = line.substring(0, firstComma).trim();
            const deptName = DEPT_MAP[rawDeptName] || rawDeptName;

            let facultyJsonStr = line.substring(secondComma + 1).trim();
            if (facultyJsonStr.startsWith("\"") && facultyJsonStr.endsWith("\"")) {
                facultyJsonStr = facultyJsonStr.substring(1, facultyJsonStr.length - 1);
            }
            // Replace double double quotes with single double quotes for valid JSON
            facultyJsonStr = facultyJsonStr.replace(/""/g, "\"");

            // Find Department
            const department = await Department.findOne({
                where: { DepartmentName: deptName }
            });

            if (!department) {
                console.warn(`Department '${deptName}' not found in database! Skipping...`);
                continue;
            }

            console.log(`\nProcessing Department: ${department.DepartmentName} (ID: ${department.DepartmentID})`);

            let faculties = [];
            try {
                faculties = JSON.parse(facultyJsonStr);
            } catch (err) {
                console.error(`Failed to parse faculty JSON for ${deptName}:`, err);
                console.error(`JSON snippet: ${facultyJsonStr.substring(0, 100)}...`);
                continue;
            }

            for (const fData of faculties) {
                const name = fData.name.trim();
                const designation = fData.designation.trim();
                const imageUrl = fData.profile_picture_url ? fData.profile_picture_url.trim() : "";

                // Try to find existing faculty
                let faculty = await Faculty.findOne({
                    where: {
                        Name: name,
                        DepartmentID: department.DepartmentID
                    }
                });

                if (!faculty) {
                    // Create
                    await Faculty.create({
                        Name: name,
                        Designation: designation,
                        ProfileImageURL: imageUrl,
                        DepartmentID: department.DepartmentID,
                    });
                    totalCreated++;
                    console.log(`  [NEW] ${name}`);
                } else {
                    // Update if changed
                    if (faculty.Designation !== designation || faculty.ProfileImageURL !== imageUrl) {
                        faculty.Designation = designation;
                        faculty.ProfileImageURL = imageUrl;
                        await faculty.save();
                        totalUpdated++;
                        console.log(`  [UPD] ${name}`);
                    }
                }
            }
        }

        console.log(`\nImport Complete!`);
        console.log(`Total Created: ${totalCreated}`);
        console.log(`Total Updated: ${totalUpdated}`);

        process.exit(0);
    } catch (error) {
        console.error("Error importing faculty:", error);
        process.exit(1);
    }
};

importAllFaculty();
