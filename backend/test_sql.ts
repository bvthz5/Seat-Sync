
import { Exam } from './src/models/Exam.js';
import { Subject } from './src/models/Subject.js';
import { Department } from './src/models/Department.js';
import { Semester } from './src/models/Semester.js';
import { Program } from './src/models/Program.js';
import { ExamSeries } from './src/models/ExamSeries.js';
import { sequelize } from './src/config/database.js';

async function test() {
    try {
        const sql = await Exam.findAll({
            where: { ExamSeriesID: 1 },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM ExamRegistrations AS er
                            WHERE er.ExamID = Exam.ExamID
                        )`),
                        'registrationCount'
                    ]
                ]
            },
            include: [
                {
                    model: Subject,
                    include: [
                        { model: Department },
                        {
                            model: Semester,
                            include: [{ model: Program }]
                        }
                    ]
                },
                { model: ExamSeries }
            ],
            logging: (msg) => {
                console.log("GENERATED SQL:");
                console.log(msg);
            }
        });
    } catch (err) {
        console.error("ERROR:");
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

test();
