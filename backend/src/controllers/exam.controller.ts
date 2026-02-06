
import { Request, Response } from 'express';
import { Exam } from '../models/Exam.js';
import { Subject } from '../models/Subject.js';
import { Department } from '../models/Department.js';
import { Semester } from "../models/Semester.js";
import { AcademicYear } from "../models/AcademicYear.js";
import { Op } from 'sequelize';
import { ExamSeries } from '../models/index.js';
import * as XLSX from 'xlsx';
import { sequelize } from '../config/database.js';

export class ExamController {

    // Get all exams with optional filtering
    static async getExams(req: Request, res: Response) {
        try {
            const { search, status, startDate, endDate, department, seriesId } = req.query;

            const whereClause: any = {};
            const subjectWhereClause: any = {};

            if (search) {
                whereClause.ExamName = { [Op.like]: `%${search}%` };
            }

            if (status) {
                whereClause.Status = status;
            }

            if (startDate && endDate) {
                whereClause.ExamDate = {
                    [Op.between]: [startDate, endDate]
                };
            }

            if (department && department !== 'All') {
                subjectWhereClause.DepartmentID = department;
            }

            if (seriesId) {
                whereClause.ExamSeriesID = seriesId;
            }

            const exams = await Exam.findAll({
                where: whereClause,
                include: [
                    {
                        model: Subject,
                        where: subjectWhereClause,
                        attributes: ['SubjectName', 'SubjectCode', 'DepartmentID'],
                        include: [{
                            model: Department,
                            attributes: ['DepartmentName', 'DepartmentCode']
                        }]
                    },
                    {
                        model: ExamSeries,
                        attributes: ['SeriesName', 'ExamSeriesID']
                    }
                ],
                order: [['ExamDate', 'ASC']]
            });

            res.json(exams);
        } catch (error: any) {
            res.status(500).json({ message: 'Error fetching exams', error: error.message });
        }
    }

    // Create a new exam
    static async createExam(req: Request, res: Response) {
        try {
            const { SubjectID, ExamName, ExamDate, Session, Duration } = req.body;

            // Basic validation
            if (!SubjectID || !ExamName || !ExamDate || !Session || !Duration) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Determine status based on date (simple logic for now)
            const examDateObj = new Date(ExamDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let status = 'Scheduled';
            if (examDateObj < today) {
                status = 'Completed';
            }

            const newExam = await Exam.create({
                SubjectID,
                ExamName,
                ExamDate,
                Session,
                Duration,
                Status: status
            });

            res.status(201).json(newExam);
        } catch (error: any) {
            res.status(500).json({ message: 'Error creating exam', error: error.message });
        }
    }

    // Update an exam
    static async updateExam(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const exam = await Exam.findByPk(id as string);
            if (!exam) {
                return res.status(404).json({ message: 'Exam not found' });
            }

            await exam.update(updates);
            res.json(exam);
        } catch (error: any) {
            res.status(500).json({ message: 'Error updating exam', error: error.message });
        }
    }

    // Delete an exam
    static async deleteExam(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const exam = await Exam.findByPk(id as string);

            if (!exam) {
                return res.status(404).json({ message: 'Exam not found' });
            }

            await exam.destroy();
            res.json({ message: 'Exam deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ message: 'Error deleting exam', error: error.message });
        }
    }

    // Get statistics for dashboard
    static async getStats(req: Request, res: Response) {
        try {
            const { seriesId } = req.query;
            const whereClause: any = {};

            if (seriesId) {
                whereClause.ExamSeriesID = seriesId;
            }

            const totalExams = await Exam.count({ where: whereClause });
            const completedExams = await Exam.count({ where: { Status: 'Completed' } });
            const upcomingExams = await Exam.count({
                where: {
                    ExamDate: { [Op.gte]: new Date() }
                }
            });

            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const activeToday = await Exam.count({
                where: {
                    ...whereClause,
                    ExamDate: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                }
            });

            res.json({
                total: totalExams,
                completed: completedExams,
                upcoming: upcomingExams,
                activeToday: activeToday
            });
        } catch (error: any) {
            res.status(500).json({ message: 'Error fetching stats', error: error.message });
        }
    }
    // Export template for exam import
    static async exportTimetableTemplate(req: Request, res: Response) {
        try {
            const sampleData = [
                {
                    "Program": "B.Tech",
                    "Date": "15 Nov 2025",
                    "Time": "09:30 am - 12:30 pm",
                    "Course Code": "CS101",
                    "Course Name": "Computer Science Basics",
                    "Slot": "A",
                    "Branches": "CS"
                },
                {
                    "Program": "B.Tech",
                    "Date": "17 Nov 2025",
                    "Time": "01:30 pm - 04:30 pm",
                    "Course Code": "MA202",
                    "Course Name": "Mathematics II",
                    "Slot": "B",
                    "Branches": "MA, CS"
                }
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(sampleData);

            // Add instructions
            XLSX.utils.sheet_add_aoa(ws, [
                ["Instructions: Date format 'dd MMM yyyy' or 'YYYY-MM-DD'. Time range like '09:30 am - 12:30 pm'. Branches are Dept Codes."]
            ], { origin: "I1" });

            XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', 'attachment; filename=exam_timetable_template.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (error: any) {
            console.error("Template export error:", error);
            res.status(500).json({ message: "Failed to generate template" });
        }
    }

    // Import timetable from Excel
    static async importTimetable(req: Request, res: Response) {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        try {
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                return res.status(400).json({ message: "Invalid Excel file: No sheets found" });
            }
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                return res.status(400).json({ message: "Invalid Excel file: Sheet not found" });
            }
            const data: any[] = XLSX.utils.sheet_to_json(sheet);
            const { seriesId } = req.body;

            // Optional: check if series exists
            if (seriesId) {
                const seriesExists = await ExamSeries.findByPk(seriesId);
                if (!seriesExists) {
                    return res.status(400).json({ message: "Invalid Exam Series selected" });
                }
            }

            // Safety Check: Ensure Semester 1 and at least one Academic Year exist
            const semesterOne = await Semester.findByPk(1);
            if (!semesterOne) {
                return res.status(400).json({
                    message: "Deployment Error: Semester ID 1 not found in database. Please contact support."
                });
            }

            const ayCount = await AcademicYear.count();
            if (ayCount === 0) {
                return res.status(400).json({
                    message: "Setup Error: No Academic Years found. Please create at least one Academic Year."
                });
            }

            let successCount = 0;
            let errors: string[] = [];

            // Cache (No transaction needed for initial load)
            const deptCache = new Map<string, number>();
            const subjectCache = new Map<string, number>();

            // Pre-load existing data to avoid redundant queries
            const existingDepts = await Department.findAll();
            existingDepts.forEach(d => deptCache.set(d.DepartmentCode, d.DepartmentID));

            const existingSubjects = await Subject.findAll();
            existingSubjects.forEach(s => subjectCache.set(s.SubjectCode, s.SubjectID));

            for (const row of data) {
                try {
                    // Flexible Column Mapping
                    const deptRaw = row['DepartmentCode'] || row['Department Code'] || row['Department'] || row['Branches'] || row['Branch'];
                    const codeRaw = row['SubjectCode'] || row['Subject Code'] || row['Code'] || row['Course Code'];
                    const nameRaw = row['SubjectName'] || row['Subject Name'] || row['Course Name'] || row['Name'];
                    const dateRaw = row['ExamDate'] || row['Date'];
                    const timeRaw = row['Session'] || row['Time'];
                    const importedExamName = row['ExamName'] || row['Exam Name'];
                    const durationRaw = row['Duration'];

                    const code = codeRaw ? String(codeRaw).trim() : null;
                    const deptCode = deptRaw ? String(deptRaw).trim() : null;
                    const subjectName = nameRaw ? String(nameRaw).trim() : (code || 'Unknown Subject');

                    if (!code || !dateRaw) {
                        if (!code && !dateRaw) continue;
                        throw new Error(`Missing required fields (Code/Date) for row: ${JSON.stringify(row)}`);
                    }

                    // 1. Resolve Department (Find or Create)
                    let departmentID: number = 1; // Default
                    if (deptCode) {
                        const firstDeptRaw = String(deptCode).split(',')[0];
                        const firstDept = firstDeptRaw ? firstDeptRaw.trim() : 'Unknown';
                        const cachedID = deptCache.get(firstDept);

                        if (cachedID !== undefined) {
                            departmentID = cachedID;
                        } else {
                            const [dept] = await Department.findOrCreate({
                                where: { DepartmentCode: firstDept },
                                defaults: {
                                    DepartmentCode: firstDept,
                                    DepartmentName: firstDept
                                }
                            });
                            departmentID = dept.DepartmentID;
                            deptCache.set(firstDept, departmentID);
                        }
                    }

                    // 2. Resolve Subject (Find or Create)
                    let subjectID: number;
                    const cleanCode = String(code).trim();
                    const cachedSubjID = subjectCache.get(cleanCode);

                    if (cachedSubjID !== undefined) {
                        subjectID = cachedSubjID;
                    } else {
                        const [subj] = await Subject.findOrCreate({
                            where: { SubjectCode: cleanCode },
                            defaults: {
                                SubjectCode: cleanCode,
                                SubjectName: subjectName,
                                DepartmentID: departmentID,
                                SemesterID: 1
                            }
                        });
                        subjectID = subj.SubjectID;
                        subjectCache.set(cleanCode, subjectID);
                    }

                    // 3. Parse Date
                    let examDate: Date | null = null;
                    const dateStrRaw: string = String(dateRaw).trim();

                    // Try standard JS parsing first
                    const standardDate = new Date(dateStrRaw);
                    if (!isNaN(standardDate.getTime())) {
                        examDate = standardDate;
                    } else {
                        // Try parsing common DD/MM/YYYY formats
                        const ddmmyyyyMatch = dateStrRaw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
                        if (ddmmyyyyMatch && ddmmyyyyMatch[1] && ddmmyyyyMatch[2] && ddmmyyyyMatch[3]) {
                            const d = parseInt(ddmmyyyyMatch[1]);
                            const m = parseInt(ddmmyyyyMatch[2]);
                            let y = parseInt(ddmmyyyyMatch[3]);
                            if (y < 100) y += 2000;
                            const manualDate = new Date(y, m - 1, d);
                            if (!isNaN(manualDate.getTime())) {
                                examDate = manualDate;
                            }
                        }
                    }

                    if (!examDate) {
                        throw new Error(`Invalid Date format for '${cleanCode}': ${dateStrRaw}. Expected DD/MM/YYYY or YYYY-MM-DD.`);
                    }
                    const formattedDate: string = examDate.toISOString().split('T')[0] as string;

                    // 4. Parse Session
                    let session = 'FN';
                    let duration: number = typeof durationRaw === 'number' ? durationRaw : 180;

                    if (timeRaw) {
                        const timeStr: string = String(timeRaw).toLowerCase();
                        if (timeStr === 'fn' || timeStr === 'an') {
                            session = timeStr.toUpperCase();
                        } else if (timeStr.includes('am') || timeStr.includes('pm') || timeStr.includes('-')) {
                            const rawParts: string[] = timeStr.split('-');
                            if (rawParts.length > 0) {
                                const part0 = rawParts[0];
                                const startPart: string = part0 ? part0.trim() : '';
                                if (startPart) {
                                    const hourMatch = startPart.match(/(\d+)/);
                                    if (hourMatch) {
                                        let h: number = parseInt(hourMatch[1] || '0');
                                        const isPM: boolean = startPart.includes('pm');
                                        const isAM: boolean = startPart.includes('am');
                                        if (isPM) {
                                            if (h < 12) h += 12;
                                            session = 'AN';
                                        } else if (isAM) {
                                            session = 'FN';
                                        } else {
                                            if (h >= 12) session = 'AN';
                                            else if (h >= 1 && h <= 6) session = 'AN';
                                            else session = 'FN';
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 5. Check Conflicts
                    const existingExam = await Exam.findOne({
                        where: {
                            SubjectID: subjectID,
                            ExamDate: formattedDate,
                            Session: session
                        }
                    });

                    if (existingExam) {
                        throw new Error(`EXISTS: ${cleanCode} on ${formattedDate} (${session})`);
                    }

                    const rawTitle = req.body.title;
                    const defaultPrefix: string = rawTitle ? String(rawTitle) : 'Exam';
                    await Exam.create({
                        SubjectID: subjectID,
                        ExamSeriesID: seriesId ? parseInt(String(seriesId)) : null,
                        ExamName: importedExamName || `${defaultPrefix} - ${subjectName}`,
                        ExamDate: formattedDate as any,
                        Session: session.toUpperCase(),
                        Duration: duration || 180,
                        Status: new Date(formattedDate) < new Date() ? 'Completed' : 'Scheduled'
                    } as any);

                    successCount++;
                } catch (err: any) {
                    errors.push(err.message);
                }
            }

            res.json({
                message: successCount > 0 ? "Import complete" : "Import failed",
                successCount,
                errorCount: errors.length,
                errors: errors.slice(0, 20)
            });

        } catch (error: any) {
            console.error("Import error:", error);
            res.status(500).json({ message: "Fatal error during import", error: error.message });
        }
    }
}
