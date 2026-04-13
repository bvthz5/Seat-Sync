
import { Request, Response } from 'express';
import { Exam } from '../models/Exam.js';
import { Subject } from '../models/Subject.js';
import { Department } from '../models/Department.js';
import { Semester } from "../models/Semester.js";
import { Program } from "../models/Program.js";
import { AcademicYear } from "../models/AcademicYear.js";
import { Op, QueryTypes } from 'sequelize';
import { ExamSeries } from '../models/index.js';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { sequelize } from '../config/database.js';

const DATE_PATTERN =
    /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/;
const SUBJECT_CODE_PATTERN = /\b[A-Z]{2,}[0-9]{2,}[A-Z0-9-]*\b/;
const TIME_RANGE_PATTERN =
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i;

const extractRowsFromSpreadsheet = (buffer: Buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('Invalid file: No sheets found');
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error('Invalid file: Sheet not found');
    }
    return XLSX.utils.sheet_to_json(sheet) as any[];
};

const extractRowsFromPdf = async (buffer: Buffer) => {
    const parser = new PDFParse({ data: buffer });
    try {
        const textResult = await parser.getText();
        const lines = (textResult.text || '')
            .split(/\r?\n/)
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        const rows: any[] = [];

        for (const line of lines) {
            const dateMatch = line.match(DATE_PATTERN);
            const codeMatch = line.match(SUBJECT_CODE_PATTERN);
            if (!dateMatch || !codeMatch) {
                continue;
            }

            const timeMatch = line.match(TIME_RANGE_PATTERN);
            const dateValue = dateMatch[0];
            const codeValue = codeMatch[0];
            const timeValue = timeMatch?.[0];

            const subjectName = line
                .replace(dateValue, ' ')
                .replace(codeValue, ' ')
                .replace(timeValue || '', ' ')
                .replace(/\s+/g, ' ')
                .trim();

            rows.push({
                Date: dateValue,
                'Course Code': codeValue,
                'Course Name': subjectName || codeValue,
                Time: timeValue || undefined
            });
        }

        return rows;
    } finally {
        await parser.destroy();
    }
};

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

            // Compute dynamic status based on date, session, and duration
            const now = new Date();
            const examsWithStatus = exams.map(exam => {
                const examData = exam.toJSON() as any;
                const examDate = new Date(examData.ExamDate);

                // Session start times: FN = 10:00 AM, AN = 2:00 PM
                const startHour = examData.Session === 'FN' ? 10 : 14;
                const startMinute = 0;

                // Build exam start datetime
                const examStart = new Date(examDate);
                examStart.setHours(startHour, startMinute, 0, 0);

                // Build exam end datetime (start + duration in minutes)
                const examEnd = new Date(examStart.getTime() + (examData.Duration || 180) * 60 * 1000);

                if (now >= examEnd) {
                    examData.Status = 'Completed';
                } else if (now >= examStart && now < examEnd) {
                    examData.Status = 'In Progress';
                } else {
                    examData.Status = 'Scheduled';
                }

                return examData;
            });

            res.json(examsWithStatus);
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
                Status: status,
                IsEmergencyMode: false,
                AttendanceLocked: false
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

            // 1. Delete associated registrations derived from this exam
            try {
                // We need to import ExamRegistration model if not present, or use raw query if easier
                // But let's assume we can use the model if imported. 
                // Since I can't guarantee import is up top in this single replacement, I will use sequelize.query or ExamRegistration if I add import.
                // BEST PRACTICE: Use the model. I will add the import in a separate tool call or use fully qualified if possible? No.
                // I'll assume I can add the import in a previous step or here.
                // Actually, I can use a raw query to be safe given the context limits:
                // "DELETE FROM ExamRegistrations WHERE ExamID = :id"
                await sequelize.query('DELETE FROM ExamRegistrations WHERE ExamID = :id', {
                    replacements: { id: exam.ExamID },
                    type: QueryTypes.DELETE
                });
            } catch (err) {
                console.error("Error cleaning up registrations:", err);
                // Continue? If this fails, exam.destroy might fail too if FK exists.
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

            // Use date-based logic matching the dynamic status in getExams
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

            // Completed = exam date is before today
            const completedExams = await Exam.count({
                where: {
                    ...whereClause,
                    ExamDate: { [Op.lt]: todayStr }
                }
            });

            // Upcoming = exam date is after today
            const upcomingExams = await Exam.count({
                where: {
                    ...whereClause,
                    ExamDate: { [Op.gt]: todayStr }
                }
            });

            // Active today = exam date is today
            const activeToday = await Exam.count({
                where: {
                    ...whereClause,
                    ExamDate: todayStr
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

    // Import timetable from Excel/CSV/PDF
    static async importTimetable(req: Request, res: Response) {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        try {
            const filename = (req.file.originalname || '').toLowerCase();
            const isPdf = req.file.mimetype === 'application/pdf' || filename.endsWith('.pdf');
            const data: any[] = isPdf
                ? await extractRowsFromPdf(req.file.buffer)
                : extractRowsFromSpreadsheet(req.file.buffer);

            if (!Array.isArray(data) || data.length === 0) {
                return res.status(400).json({
                    message: isPdf
                        ? "No timetable rows could be parsed from PDF. Please verify the PDF format or use the Excel template."
                        : "No rows found in uploaded file"
                });
            }

            const { seriesId } = req.body;

            // Optional: check if series exists
            if (seriesId) {
                const seriesExists = await ExamSeries.findByPk(seriesId);
                if (!seriesExists) {
                    return res.status(400).json({ message: "Invalid Exam Series selected" });
                }
            }

            // Ensure at least one Academic Year exists
            const ayCount = await AcademicYear.count();
            if (ayCount === 0) {
                return res.status(400).json({
                    message: "Setup Error: No Academic Years found. Please create at least one Academic Year."
                });
            }

            // Get or create default semester for subject assignment during import
            let defaultSemesterID = 1;
            let semesterOne = await Semester.findByPk(1);
            if (!semesterOne) {
                console.log("[importTimetable] Semester ID 1 not found, finding or creating default...");
                let anySemester = await Semester.findOne();
                if (anySemester) {
                    defaultSemesterID = anySemester.SemesterID;
                    console.log(`[importTimetable] Using existing semester ID ${defaultSemesterID}`);
                } else {
                    // Create a default semester - find first program
                    const program = await Program.findOne();
                    if (program) {
                        try {
                            const newSem = await Semester.create({
                                SemesterNumber: 1,
                                SemesterName: "Semester 1",
                                ProgramID: program.ProgramID
                            });
                            defaultSemesterID = newSem.SemesterID;
                            console.log(`[importTimetable] Created default semester ID ${defaultSemesterID}`);
                        } catch (e: any) {
                            console.warn("[importTimetable] Could not create default semester:", e.message);
                            // Fallback to ID 1 anyway
                        }
                    }
                }
            }

            let successCount = 0;
            let updatedCount = 0;
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
                                SemesterID: defaultSemesterID
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
                        // Update existing (UPSERT behavior)
                        console.log(`Updating existing exam: ${cleanCode} on ${formattedDate}`);
                        await existingExam.update({
                            ExamName: importedExamName || existingExam.ExamName,
                            Duration: durationRaw ? parseInt(String(durationRaw)) : existingExam.Duration,
                            ExamSeriesID: seriesId ? parseInt(String(seriesId)) : (existingExam.ExamSeriesID || null),
                            Status: new Date(formattedDate as any) < new Date() ? 'Completed' : 'Scheduled' // Auto-update status based on date
                        } as any);
                        updatedCount++;
                    } else {
                        // Create New
                        const rawTitle = req.body.title;
                        const defaultPrefix: string = rawTitle ? String(rawTitle) : 'Exam';
                        await Exam.create({
                            SubjectID: subjectID,
                            ExamSeriesID: seriesId ? parseInt(String(seriesId)) : undefined,
                            ExamName: importedExamName || `${defaultPrefix} - ${subjectName}`,
                            ExamDate: formattedDate as any,
                            Session: session.toUpperCase(),
                            Duration: durationRaw ? parseInt(String(durationRaw)) : 180,
                            Status: new Date(formattedDate as any) < new Date() ? 'Completed' : 'Scheduled'
                        } as any);
                        successCount++;
                    }
                } catch (err: any) {
                    console.error("Row Error:", err.message);
                    errors.push(`Row ${data.indexOf(row) + 2}: ${err.message}`);
                }
            }

            if (errors.length > 0) {
                console.error("Import Errors:", errors);
            }

            // Trigger Logic-Based Audit
            // Trigger Logic-Based Audit
            if (seriesId) {
                const sId = parseInt(String(seriesId));
                if (!isNaN(sId)) {
                    await ExamController.auditSeries(sId);
                }
            }

            return res.json({
                success: true,
                message: isPdf ? "PDF import processing complete" : "Import processing complete",
                successCount,
                updatedCount,
                errorCount: errors.length,
                errors
            });

        } catch (error: any) {
            console.error("Import error:", error);
            res.status(500).json({ message: "Fatal error during import", error: error.message });
        }
    }

    // Logic-Based Timetable Audit
    static async auditSeries(seriesId: number) {
        console.log(`Starting Audit for Series ID: ${seriesId}`);
        try {
            // 1. Fetch all exams in this series with Subject/Department info
            const exams = await Exam.findAll({
                where: { ExamSeriesID: seriesId },
                include: [{
                    model: Subject,
                    include: [
                        { model: Department, attributes: ['DepartmentCode'] },
                        { model: Semester, attributes: ['SemesterID'] }
                    ]
                }]
            });

            // 2. Clear previous audit status
            await Exam.update(
                { AuditStatus: 'Clean', ConflictDetails: null } as any,
                { where: { ExamSeriesID: seriesId } }
            );

            const updates: Promise<any>[] = [];

            // 3. Group by Date + Session
            const slots = new Map<string, any[]>();
            exams.forEach(exam => {
                const key = `${exam.ExamDate}_${exam.Session}`;
                if (!slots.has(key)) slots.set(key, []);
                slots.get(key)?.push(exam);
            });

            // 4. Check for Batch Conflicts (Same Dept + Semester in same slot)
            for (const [slot, slotExams] of slots.entries()) {
                const batches = new Map<string, any[]>();

                // Group by Batch (Dept + Semester)
                slotExams.forEach(exam => {
                    const subject = (exam as any).Subject;
                    if (!subject) return;

                    const batchKey = `${subject.DepartmentID}_${subject.SemesterID}`;
                    if (!batches.has(batchKey)) batches.set(batchKey, []);
                    batches.get(batchKey)?.push(exam);
                });

                // Detect Conflicts
                for (const [batchKey, batchExams] of batches.entries()) {
                    if (batchExams.length > 1) {
                        // CONFLICT FOUND: Multiple exams for same batch in same slot
                        const confSubjects = batchExams.map(e => e.Subject.SubjectCode).join(', ');

                        batchExams.forEach(exam => {
                            updates.push(exam.update({
                                AuditStatus: 'Conflict',
                                ConflictDetails: `Clash with: ${confSubjects}`
                            } as any));
                        });
                        console.log(`Conflict found in ${slot} for batch ${batchKey}: ${confSubjects}`);
                    }
                }
            }

            await Promise.all(updates);
            console.log(`Audit Complete. ${updates.length} exams flagged.`);

        } catch (error) {
            console.error("Audit Failed:", error);
        }
    }
}
