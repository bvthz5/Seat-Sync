import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Program } from "../models/Program.js";
import { Semester } from "../models/Semester.js";
import { sequelize, connectDB } from "../config/database.js";
import { Op } from "sequelize";

async function run() {
    try {
        await connectDB();
        console.log("Connected. Testing getAllStudents query logic...");

        const search = "a";
        const studentWhere: any = {};

        if (search) {
            studentWhere[Op.or] = [
                { RegisterNumber: { [Op.like]: `%${search}%` } },
                { '$User.FullName$': { [Op.like]: `%${search}%` } },
                { '$User.Email$': { [Op.like]: `%${search}%` } }
            ];
        }

        console.log("1. Testing main findAndCountAll...");
        const result = await Student.findAndCountAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    attributes: ['Email', 'Role', 'FullName'],
                    required: true
                },
                { model: Department, attributes: ['DepartmentName', 'DepartmentCode'] },
                { model: Program, attributes: ['ProgramName'] },
                { model: Semester, attributes: ['SemesterNumber'] }
            ],
            limit: 10,
            offset: 0,
            order: [['StudentID', 'ASC']],
            subQuery: false
        });
        console.log(`Success! Found ${result.count} students.`);

        console.log("2. Testing Stats queries (All)...");
        const commonInclude = search ? [{ model: User, attributes: [], required: true }] : [];

        const [deptResults, batchResults, incompleteProfiles, totalDatabaseCount] = await Promise.all([
            Student.findAll({
                where: studentWhere,
                include: commonInclude,
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('DepartmentID')), 'DepartmentID']],
                raw: true
            }),
            Student.findAll({
                where: studentWhere,
                include: commonInclude,
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('BatchYear')), 'BatchYear']],
                raw: true
            }),
            Student.count({
                where: {
                    ...studentWhere,
                    // Note: If studentWhere has [Op.or], this will overwrite it in some versions of Sequelize if not careful.
                    // Better to use Op.and for combining filters.
                },
                include: commonInclude
            }),
            Student.count()
        ]);
        console.log(`Stats success: ${deptResults.length} depts, ${batchResults.length} batches, ${incompleteProfiles} rows in count.`);

        console.log("3. Testing getCreateOptions (Metadata)...");
        const departments = await Department.findAll({ attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] });
        const programs = await Program.findAll({ attributes: ['ProgramID', 'ProgramName'] });
        const semesters = await Semester.findAll({ attributes: ['SemesterID', 'SemesterNumber', 'ProgramID'] });
        console.log(`Success! Found ${departments.length} depts, ${programs.length} programs, ${semesters.length} semesters.`);

        console.log("\nAll core queries PASSED.");

    } catch (err: any) {
        console.error("\n--- QUERY FAILED ---");
        console.error("Message:", err.message);
        if (err.parent) {
            console.error("SQL:", err.sql);
            console.error("Original Error:", err.parent.message);
        }
    } finally {
        await sequelize.close();
    }
}

run();
