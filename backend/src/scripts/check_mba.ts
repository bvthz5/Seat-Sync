import { sequelize } from '../config/database.js';

async function checkMBAReferences() {
    try {
        await sequelize.authenticate();
        console.log('Database connected\n');

        // Get MBA ProgramID first
        const [programs] = await sequelize.query(`
            SELECT ProgramID, ProgramCode, ProgramName 
            FROM Programs 
            WHERE ProgramCode = 'MBA'
        `);

        if (programs.length === 0) {
            console.log('MBA program not found');
            return;
        }

        const mba = programs[0] as any;
        console.log('=== MBA Program ===');
        console.log(`ProgramID: ${mba.ProgramID}`);
        console.log(`ProgramCode: ${mba.ProgramCode}`);
        console.log(`ProgramName: ${mba.ProgramName}\n`);

        // Check Students
        const [students] = await sequelize.query(`
            SELECT COUNT(*) as count FROM Students WHERE ProgramID = ${mba.ProgramID}
        `);
        const studentCount = (students[0] as any).count;
        console.log(`Students: ${studentCount}`);

        // Check Subjects
        const [subjects] = await sequelize.query(`
            SELECT COUNT(*) as count FROM Subjects WHERE ProgramID = ${mba.ProgramID}
        `);
        const subjectCount = (subjects[0] as any).count;
        console.log(`Subjects: ${subjectCount}`);

        // Check Semesters
        const [semesters] = await sequelize.query(`
            SELECT COUNT(*) as count FROM Semesters WHERE ProgramID = ${mba.ProgramID}
        `);
        const semesterCount = (semesters[0] as any).count;
        console.log(`Semesters: ${semesterCount}\n`);

        // Summary
        console.log('=== Summary ===');
        if (studentCount === 0 && subjectCount === 0 && semesterCount === 0) {
            console.log('✅ MBA has NO references - should be deletable!');
            console.log('If deletion still fails, there may be other constraints.');
        } else {
            console.log('❌ MBA has the following references:');
            if (studentCount > 0) console.log(`  - ${studentCount} student(s)`);
            if (subjectCount > 0) console.log(`  - ${subjectCount} subject(s)`);
            if (semesterCount > 0) console.log(`  - ${semesterCount} semester(s)`);
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkMBAReferences();
