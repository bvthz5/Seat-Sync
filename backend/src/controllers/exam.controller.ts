
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
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import mammoth from 'mammoth';
import { sequelize } from '../config/database.js';

const require = createRequire(import.meta.url);

const DATE_PATTERN =
    /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s*[A-Za-z]{3,9}\.?\s*\d{4})\b/;
const SUBJECT_CODE_PATTERN = /\b(?:2\d[A-Z]{2,}[A-Z0-9]*\d{2,}|[A-Z]{2,}[0-9]{2,}[A-Z0-9-]*)\b/;
const TIME_RANGE_PATTERN =
    /\b\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\s*(?:-|–|to)\s*\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\b/i;
const OCR_CACHE_PATH = path.join(os.tmpdir(), 'seat-sync-tesseract-cache');

const excelSerialToDate = (serial: number): Date | null => {
    if (!Number.isFinite(serial)) return null;
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (isNaN(dateInfo.getTime())) return null;
    return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
};

const parseExamDateValue = (raw: unknown): Date | null => {
    if (raw instanceof Date && !isNaN(raw.getTime())) {
        return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
    }

    if (typeof raw === 'number') {
        return excelSerialToDate(raw);
    }

    const text = String(raw ?? '').trim();
    if (!text) return null;

    if (/^\d+(\.\d+)?$/.test(text)) {
        return excelSerialToDate(parseFloat(text));
    }

    const ymdMatch = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (ymdMatch && ymdMatch[1] && ymdMatch[2] && ymdMatch[3]) {
        const y = parseInt(ymdMatch[1]);
        const m = parseInt(ymdMatch[2]);
        const d = parseInt(ymdMatch[3]);
        const parsed = new Date(y, m - 1, d);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    const ddmmyyyyMatch = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (ddmmyyyyMatch && ddmmyyyyMatch[1] && ddmmyyyyMatch[2] && ddmmyyyyMatch[3]) {
        const d = parseInt(ddmmyyyyMatch[1]);
        const m = parseInt(ddmmyyyyMatch[2]);
        let y = parseInt(ddmmyyyyMatch[3]);
        if (y < 100) y += 2000;
        const manualDate = new Date(y, m - 1, d);
        if (!isNaN(manualDate.getTime())) {
            return manualDate;
        }
    }

    const standardDate = new Date(text);
    if (!isNaN(standardDate.getTime())) {
        return new Date(standardDate.getFullYear(), standardDate.getMonth(), standardDate.getDate());
    }

    return null;
};

const formatDateForDb = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseDepartmentCodes = (raw: unknown): string[] => {
    const text = String(raw ?? '').trim();
    if (!text) return [];
    return [...new Set(
        text
            .split(/[,&/;|]+/)
            .map((s) => normalizeDepartmentCode(s))
            .filter(Boolean)
    )];
};

const DEPARTMENT_CODE_ALIASES: Record<string, string> = {
    INMCA: 'IMCA',
    ITCS: 'CSE',
    ITCE: 'CE',
    ITEC: 'ECE',
    ITEE: 'EEE',
};

const DEPARTMENT_CODE_DISPLAY_NAMES: Record<string, string> = {
    IMCA: 'Integrated MCA',
};

const normalizeDepartmentCode = (value: unknown): string => {
    const raw = String(value ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
    if (!raw) return '';
    return DEPARTMENT_CODE_ALIASES[raw] || raw;
};

const getDepartmentCodeCandidates = (value: unknown): string[] => {
    const normalized = normalizeDepartmentCode(value);
    if (!normalized) return [];

    const candidates: string[] = [normalized];
    if (normalized.startsWith('IT') && normalized.length > 2) {
        candidates.push(normalizeDepartmentCode(normalized.slice(2)));
    }
    return [...new Set(candidates.filter(Boolean))];
};

const inferDepartmentCodeFromCourseCode = (courseCodeRaw: unknown): string | null => {
    const courseCode = String(courseCodeRaw ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
    if (!courseCode) return null;

    // Example: 24SJINMCA107 -> INMCA (between SJ and trailing numeric paper code)
    const matched = courseCode.match(/SJ([A-Z]+)\d{2,4}$/);
    if (!matched || !matched[1]) return null;
    return normalizeDepartmentCode(matched[1]);
};

const flattenRtfText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) {
        return node.map((item) => flattenRtfText(item)).join('');
    }
    if (typeof node === 'object') {
        if (typeof node.value === 'string') {
            return node.value;
        }
        if (Array.isArray(node.content)) {
            return node.content.map((item: any) => flattenRtfText(item)).join('');
        }
    }
    return '';
};

const stripRtfToText = (rtf: string): string => {
    const withHexDecoded = rtf.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );

    return withHexDecoded
        .replace(/\\par[d]?/g, '\n')
        .replace(/\\line/g, '\n')
        .replace(/\\tab/g, ' ')
        .replace(/\\[a-zA-Z]+-?\d* ?/g, ' ')
        .replace(/[{}]/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const extractRowsFromSpreadsheet = (buffer: Buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
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

const extractRowsFromTextDocument = async (buffer: Buffer, fileType: 'docx' | 'doc' | 'rtf') => {
    let text = '';

    if (fileType === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
    } else if (fileType === 'doc') {
        const WordExtractor = require('word-extractor');
        const extractor = new WordExtractor();
        const doc = await extractor.extract(buffer);
        text = doc.getBody() || '';
    } else {
        const rtfParser = require('rtf-parser');
        const rtfString = buffer.toString('latin1');
        const doc: any = await new Promise((resolve, reject) => {
            rtfParser.string(rtfString, (err: Error | null, parsed: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(parsed);
            });
        });
        const paragraphs: any[] = Array.isArray(doc?.content) ? doc.content : [];
        text = paragraphs
            .map((paragraph: any) => flattenRtfText(paragraph).trim())
            .filter(Boolean)
            .join('\n');

        if (!text) {
            text = stripRtfToText(rtfString);
        }
    }

    return extractRowsFromLines(normalizeLines(text));
};

const normalizeLines = (text: string) =>
    text
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

const getFirstCodeFromLine = (line: string) => {
    const matches = line.match(new RegExp(SUBJECT_CODE_PATTERN.source, 'g'));
    return matches?.[0] || null;
};

const buildSubjectName = (line: string, codeValue: string, dateValue?: string, timeValue?: string) =>
    line
        .replace(dateValue || '', ' ')
        .replace(codeValue, ' ')
        .replace(timeValue || '', ' ')
        .replace(/^[\s|:-]+|[\s|:-]+$/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const extractRowsFromLines = (lines: string[]) => {
    const rows: any[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
        const dateMatch = line.match(DATE_PATTERN);
        const codeValue = getFirstCodeFromLine(line);
        if (!dateMatch || !codeValue) {
            continue;
        }

        const timeMatch = line.match(TIME_RANGE_PATTERN);
        const dateValue = dateMatch[0];
        const timeValue = timeMatch?.[0];

        const subjectName = buildSubjectName(line, codeValue, dateValue, timeValue);

        rows.push({
            Date: dateValue,
            'Course Code': codeValue,
            'Course Name': subjectName || codeValue,
            Time: timeValue || undefined
        });

        seen.add(`${dateValue}::${codeValue}`);
    }

    if (rows.length > 0) {
        return rows;
    }

    // OCR fallback extraction: date/time and code can be in adjacent lines.
    let currentDate: string | null = null;
    let currentTime: string | null = null;
    for (let i = 0; i < lines.length; i++) {
        const current = lines[i] || '';
        const lineDateMatch = current.match(DATE_PATTERN);
        if (lineDateMatch?.[0]) {
            currentDate = lineDateMatch[0];
        }
        const lineTimeMatch = current.match(TIME_RANGE_PATTERN);
        if (lineTimeMatch?.[0]) {
            currentTime = lineTimeMatch[0];
        }

        const codeValue = getFirstCodeFromLine(current);
        if (!codeValue) continue;

        const contextStart = Math.max(0, i - 4);
        const contextEnd = Math.min(lines.length, i + 3);
        const context = lines.slice(contextStart, contextEnd).join(' ');
        const contextDateMatch = context.match(DATE_PATTERN);
        const contextTimeMatch = context.match(TIME_RANGE_PATTERN);

        const dateValue = contextDateMatch?.[0] || currentDate;
        if (!dateValue) continue;

        const timeValue = contextTimeMatch?.[0] || currentTime || undefined;
        const key = `${dateValue}::${codeValue}`;
        if (seen.has(key)) continue;

        const nextLine = lines[i + 1] || '';
        const subjectName = buildSubjectName(current, codeValue, dateValue, timeValue) || nextLine.trim() || codeValue;

        rows.push({
            Date: dateValue,
            'Course Code': codeValue,
            'Course Name': subjectName,
            Time: timeValue
        });
        seen.add(key);
    }

    return rows;
};

const extractRowsFromPdf = async (buffer: Buffer) => {
    const parser = new PDFParse({ data: buffer });
    let usedOcr = false;

    try {
        const textResult = await parser.getText();
        const textLines = normalizeLines(textResult.text || '');
        let rows = extractRowsFromLines(textLines);

        if (rows.length > 0) {
            return { rows, usedOcr };
        }

        usedOcr = true;

        // OCR fallback for scanned/image-only PDFs
        const screenshots = await parser.getScreenshot({
            scale: 3,
            imageBuffer: true,
            imageDataUrl: false
        });

        if (!screenshots.pages?.length) {
            return { rows: [], usedOcr };
        }

        const worker = await createWorker('eng', undefined, {
            cachePath: OCR_CACHE_PATH
        });
        try {
            const ocrLines: string[] = [];
            for (const page of screenshots.pages) {
                if (!page.data || page.data.length === 0) {
                    continue;
                }
                const ocrResult = await worker.recognize(Buffer.from(page.data));
                ocrLines.push(...normalizeLines(ocrResult.data?.text || ''));
            }
            rows = extractRowsFromLines(ocrLines);
        } finally {
            await worker.terminate();
        }

        return { rows, usedOcr };
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

            await sequelize.query('DELETE FROM Attendance WHERE ExamID = :id', {
                replacements: { id: exam.ExamID },
                type: QueryTypes.DELETE
            });
            await sequelize.query('DELETE FROM InvigilatorAssignments WHERE ExamID = :id', {
                replacements: { id: exam.ExamID },
                type: QueryTypes.DELETE
            });
            await sequelize.query('DELETE FROM SeatAllocations WHERE ExamID = :id', {
                replacements: { id: exam.ExamID },
                type: QueryTypes.DELETE
            });
            await sequelize.query('DELETE FROM ExamRegistrations WHERE ExamID = :id', {
                replacements: { id: exam.ExamID },
                type: QueryTypes.DELETE
            });

            await exam.destroy();
            res.json({ message: 'Exam deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ message: 'Error deleting exam', error: error.message });
        }
    }

    // Delete all exams (optionally by series)
    static async deleteAllExams(req: Request, res: Response) {
        try {
            const { seriesId } = req.query;
            const parsedSeriesId = seriesId ? parseInt(String(seriesId), 10) : null;

            if (seriesId && (!parsedSeriesId || Number.isNaN(parsedSeriesId))) {
                return res.status(400).json({ message: 'Invalid seriesId' });
            }

            if (parsedSeriesId) {
                await sequelize.query(
                    'DELETE FROM Attendance WHERE ExamID IN (SELECT ExamID FROM Exams WHERE ExamSeriesID = :seriesId)',
                    {
                        replacements: { seriesId: parsedSeriesId },
                        type: QueryTypes.DELETE
                    }
                );
                await sequelize.query(
                    'DELETE FROM InvigilatorAssignments WHERE ExamID IN (SELECT ExamID FROM Exams WHERE ExamSeriesID = :seriesId)',
                    {
                        replacements: { seriesId: parsedSeriesId },
                        type: QueryTypes.DELETE
                    }
                );
                await sequelize.query(
                    'DELETE FROM SeatAllocations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE ExamSeriesID = :seriesId)',
                    {
                        replacements: { seriesId: parsedSeriesId },
                        type: QueryTypes.DELETE
                    }
                );
                await sequelize.query(
                    'DELETE FROM ExamRegistrations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE ExamSeriesID = :seriesId)',
                    {
                        replacements: { seriesId: parsedSeriesId },
                        type: QueryTypes.DELETE
                    }
                );

                const deletedCount = await Exam.destroy({ where: { ExamSeriesID: parsedSeriesId } });
                return res.json({
                    message: 'Exams deleted successfully',
                    deletedCount
                });
            }

            await sequelize.query('DELETE FROM Attendance', { type: QueryTypes.DELETE });
            await sequelize.query('DELETE FROM InvigilatorAssignments', { type: QueryTypes.DELETE });
            await sequelize.query('DELETE FROM SeatAllocations', { type: QueryTypes.DELETE });
            await sequelize.query('DELETE FROM ExamRegistrations', { type: QueryTypes.DELETE });
            const deletedCount = await Exam.destroy({ where: {} });

            return res.json({
                message: 'All exams deleted successfully',
                deletedCount
            });
        } catch (error: any) {
            return res.status(500).json({ message: 'Error deleting exams', error: error.message });
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
            const isDocx = filename.endsWith('.docx');
            const isDoc = filename.endsWith('.doc');
            const isRtf = filename.endsWith('.rtf');

            const pdfExtractResult = isPdf ? await extractRowsFromPdf(req.file.buffer) : null;
            const textDocData = (isDocx || isDoc || isRtf)
                ? await extractRowsFromTextDocument(req.file.buffer, isDocx ? 'docx' : isDoc ? 'doc' : 'rtf')
                : null;

            const data: any[] = isPdf
                ? pdfExtractResult?.rows || []
                : (textDocData || extractRowsFromSpreadsheet(req.file.buffer));

            if (!Array.isArray(data) || data.length === 0) {
                return res.status(400).json({
                    message: isPdf
                        ? "No timetable rows could be parsed from PDF (including OCR fallback). Please verify the PDF format or use the Excel template."
                        : (isDocx || isDoc || isRtf)
                            ? "No timetable rows could be parsed from the Word/RTF file. Please verify the document format or use the Excel template."
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

            // Ensure at least one Academic Year exists; create a sensible default if missing.
            const ayCount = await AcademicYear.count();
            if (ayCount === 0) {
                const now = new Date();
                const currentYear = now.getFullYear();
                const startYear = now.getMonth() >= 5 ? currentYear : currentYear - 1; // Academic year starts in June
                const endYear = startYear + 1;
                const yearName = `${startYear}-${endYear}`;
                const startDate = `${startYear}-06-01`;
                const endDate = `${endYear}-05-31`;

                await AcademicYear.create({
                    YearName: yearName,
                    StartDate: startDate as any,
                    EndDate: endDate as any,
                    IsActive: true,
                    IsCurrent: true
                } as any);
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
            existingDepts.forEach(d => deptCache.set(normalizeDepartmentCode(d.DepartmentCode), d.DepartmentID));
            let fallbackDepartmentID: number | null = existingDepts[0]?.DepartmentID ?? null;
            if (!fallbackDepartmentID) {
                const [fallbackDept] = await Department.findOrCreate({
                    where: { DepartmentCode: 'GEN' },
                    defaults: {
                        DepartmentCode: 'GEN',
                        DepartmentName: 'General'
                    }
                });
                fallbackDepartmentID = fallbackDept.DepartmentID;
                deptCache.set(normalizeDepartmentCode(fallbackDept.DepartmentCode), fallbackDepartmentID);
            }

            const existingSubjects = await Subject.findAll();
            existingSubjects.forEach(s => subjectCache.set(`${s.SubjectCode}::${s.DepartmentID}`, s.SubjectID));

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
                    const subjectName = nameRaw ? String(nameRaw).trim() : (code || 'Unknown Subject');

                    if (!code || !dateRaw) {
                        if (!code && !dateRaw) continue;
                        throw new Error(`Missing required fields (Code/Date) for row: ${JSON.stringify(row)}`);
                    }

                    const cleanCode = String(code).trim();

                    // 3. Parse Date
                    const examDate = parseExamDateValue(dateRaw);
                    const dateStrRaw: string = String(dateRaw).trim();

                    if (!examDate) {
                        throw new Error(`Invalid Date format for '${cleanCode}': ${dateStrRaw}. Expected DD/MM/YYYY or YYYY-MM-DD.`);
                    }
                    const formattedDate: string = formatDateForDb(examDate);

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

                    const deptCodesFromRow = parseDepartmentCodes(deptRaw);
                    const deptCodeFromCourse = inferDepartmentCodeFromCourseCode(cleanCode);
                    const deptCodes = deptCodeFromCourse
                        ? [deptCodeFromCourse, ...deptCodesFromRow.filter((d) => d !== deptCodeFromCourse)]
                        : deptCodesFromRow;
                    const targetDeptCodes = deptCodes.length > 0 ? deptCodes : [null];

                    for (const deptCode of targetDeptCodes) {
                        // 1. Resolve Department (Find or Create)
                        let departmentID: number = fallbackDepartmentID as number;
                        if (deptCode) {
                            const candidates = getDepartmentCodeCandidates(deptCode);
                            const initialResolvedCode = candidates[0];
                            if (!initialResolvedCode) {
                                continue;
                            }
                            let resolvedCode = initialResolvedCode;
                            let resolvedFromCache = false;

                            for (const candidate of candidates) {
                                const cachedID = deptCache.get(candidate);
                                if (cachedID !== undefined) {
                                    departmentID = cachedID;
                                    resolvedCode = candidate;
                                    resolvedFromCache = true;
                                    break;
                                }
                            }

                            if (!resolvedFromCache) {
                                const [dept] = await Department.findOrCreate({
                                    where: { DepartmentCode: resolvedCode },
                                    defaults: {
                                        DepartmentCode: resolvedCode,
                                        DepartmentName: DEPARTMENT_CODE_DISPLAY_NAMES[resolvedCode] || resolvedCode
                                    }
                                });
                                departmentID = dept.DepartmentID;
                                deptCache.set(resolvedCode, departmentID);
                            }
                        }

                        // 2. Resolve Subject (Find or Create) per dept
                        let subjectID: number;
                        const subjectKey = `${cleanCode}::${departmentID}`;
                        const cachedSubjID = subjectCache.get(subjectKey);

                        if (cachedSubjID !== undefined) {
                            subjectID = cachedSubjID;
                        } else {
                            const [subj] = await Subject.findOrCreate({
                                where: {
                                    SubjectCode: cleanCode,
                                    DepartmentID: departmentID
                                },
                                defaults: {
                                    SubjectCode: cleanCode,
                                    SubjectName: subjectName,
                                    DepartmentID: departmentID,
                                    SemesterID: defaultSemesterID
                                }
                            });
                            subjectID = subj.SubjectID;
                            subjectCache.set(subjectKey, subjectID);
                        }

                        // 3. Upsert exam for this subject/department
                        const existingExam = await Exam.findOne({
                            where: {
                                SubjectID: subjectID,
                                ExamDate: formattedDate,
                                Session: session
                            }
                        });

                        if (existingExam) {
                            await existingExam.update({
                                ExamName: importedExamName || existingExam.ExamName,
                                Duration: durationRaw ? parseInt(String(durationRaw)) : existingExam.Duration,
                                ExamSeriesID: seriesId ? parseInt(String(seriesId)) : (existingExam.ExamSeriesID || null),
                                Status: new Date(formattedDate as any) < new Date() ? 'Completed' : 'Scheduled'
                            } as any);
                            updatedCount++;
                        } else {
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
                parseMode: isPdf
                    ? (pdfExtractResult?.usedOcr ? 'pdf-ocr' : 'pdf-text')
                    : isDocx
                        ? 'docx-text'
                        : isDoc
                            ? 'doc-text'
                            : isRtf
                                ? 'rtf-text'
                                : 'spreadsheet',
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
