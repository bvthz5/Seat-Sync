import { sequelize } from './src/config/database.js';
import { InternalExam } from './src/models/InternalExam.js';
import { Exam } from './src/models/Exam.js';

async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        
        const internalExams = await InternalExam.findAll();
        console.log('--- Internal Exams ---');
        console.log(internalExams.map(ie => ({
            id: ie.InternalExamID,
            code: ie.SubjectCode,
            name: ie.SubjectName,
            date: ie.ExamDate,
            session: ie.Session,
            duration: ie.Duration
        })));

        const regularExams = await Exam.findAll();
        console.log('--- Regular Exams ---');
        console.log(regularExams.map(re => ({
            id: re.ExamID,
            name: re.ExamName,
            date: re.ExamDate,
            session: re.Session,
            duration: re.Duration
        })));
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

main();
