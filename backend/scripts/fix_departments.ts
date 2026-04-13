import { Department } from "../src/models/Department";
import { Program } from "../src/models/Program";
import { Student } from "../src/models/Student";
import { sequelize } from "../src/config/database";

async function runMigration() {
    try {
        console.log("Starting data migration to fix incorrect Departments and Programs...");
        const t = await sequelize.transaction();

        const badDepartments = await Department.findAll({
            where: sequelize.where(
                sequelize.fn('CHAR_LENGTH', sequelize.col('DepartmentName')),
                '>',
                5
            )
        });

        console.log(`Found ${badDepartments.length} potentially bad departments.`);

        for (const dept of badDepartments) {
            const name = dept.DepartmentName.trim();
            // Match things like "BHM 2023 S1"
            const match = name.match(/^([a-zA-Z]{2,10})\s+\d{4}/);
            if (match) {
                const correctCode = match[1].toUpperCase();
                
                // Find or create correct department
                let targetDept = await Department.findOne({ where: { DepartmentCode: correctCode }, transaction: t });
                if (!targetDept) {
                    targetDept = await Department.create({
                        DepartmentCode: correctCode,
                        DepartmentName: correctCode,
                        IsActive: true
                    }, { transaction: t });
                    console.log(`Created correct department: ${correctCode}`);
                }

                // Move all programs from bad dept to correct dept
                await Program.update(
                    { DepartmentID: targetDept.DepartmentID },
                    { where: { DepartmentID: dept.DepartmentID }, transaction: t }
                );

                // Move all students from bad dept to correct dept
                await Student.update(
                    { DepartmentID: targetDept.DepartmentID },
                    { where: { DepartmentID: dept.DepartmentID }, transaction: t }
                );

                // Delete bad dept
                await dept.destroy({ transaction: t });
                console.log(`Migrated logic from bad department '${name}' to '${correctCode}'`);
            }
        }

        const badPrograms = await Program.findAll({ transaction: t });
        for (const prog of badPrograms) {
            const name = prog.ProgramName;
            if (name.match(/^([a-zA-Z]{2,10})\s+\d{4}/)) {
                const code = name.match(/^([a-zA-Z]{2,10})\s+\d{4}/)?.[1].toUpperCase() || name.substring(0, 10);
                
                if (prog.DurationYears === null || prog.DurationYears === 0) {
                     await prog.update({ ProgramName: code, DurationYears: 3, TotalSemesters: 6 }, { transaction: t });
                     console.log(`Fixed program '${name}' -> '${code}' with default duration/semesters`);
                }
            }
        }

        await t.commit();
        console.log("Migration finished successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

runMigration().then(() => process.exit(0));
