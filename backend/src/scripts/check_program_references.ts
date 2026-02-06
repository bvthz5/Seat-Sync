import { sequelize } from '../config/database.js';
import { Program, Student, Subject, Semester } from '../models/index.js';

async function checkProgramReferences() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');

        // Find MBA program
        const mbaProgram = await Program.findOne({
            where: { ProgramCode: 'MBA' }
        });

        if (!mbaProgram) {
            console.log('MBA program not found');
            return;
        }

        console.log('\n=== MBA Program Details ===');
        console.log('ProgramID:', mbaProgram.ProgramID);
        console.log('ProgramCode:', mbaProgram.ProgramCode);
        console.log('ProgramName:', mbaProgram.ProgramName);

        // Check for students
        const studentCount = await Student.count({
            where: { ProgramID: mbaProgram.ProgramID }
        });
        console.log('\n=== Students ===');
        console.log('Student count:', studentCount);

        // Check for subjects
        const subjectCount = await Subject.count({
            where: { ProgramID: mbaProgram.ProgramID }
        });
        console.log('\n=== Subjects ===');
        console.log('Subject count:', subjectCount);
        if (subjectCount > 0) {
            const subjects = await Subject.findAll({
                where: { ProgramID: mbaProgram.ProgramID },
                attributes: ['SubjectID', 'SubjectCode', 'SubjectName']
            });
            console.log('Subjects:', subjects.map(s => s.toJSON()));
        }

        // Check for semesters
        const semesterCount = await Semester.count({
            where: { ProgramID: mbaProgram.ProgramID }
        });
        console.log('\n=== Semesters ===');
        console.log('Semester count:', semesterCount);
        if (semesterCount > 0) {
            const semesters = await Semester.findAll({
                where: { ProgramID: mbaProgram.ProgramID },
                attributes: ['SemesterID', 'SemesterNumber', 'SemesterName']
            });
            console.log('Semesters:', semesters.map(s => s.toJSON()));
        }

        console.log('\n=== Summary ===');
        if (studentCount === 0 && subjectCount === 0 && semesterCount === 0) {
            console.log('✅ MBA program has NO references - should be deletable');
        } else {
            console.log('❌ MBA program has references:');
            if (studentCount > 0) console.log(`  - ${studentCount} students`);
            if (subjectCount > 0) console.log(`  - ${subjectCount} subjects`);
            if (semesterCount > 0) console.log(`  - ${semesterCount} semesters`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkProgramReferences();
