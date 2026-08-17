
import { Request, Response } from 'express';
import { Exam } from '../models/Exam.js';
import { Subject } from '../models/Subject.js';
import { Department } from '../models/Department.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Semester } from "../models/Semester.js";
import { Program } from "../models/Program.js";
import { ExamRegistration } from "../models/ExamRegistration.js";
import { AcademicYear } from "../models/AcademicYear.js";
import { Op, QueryTypes } from 'sequelize';
import { ExamSeries, InternalExam, InternalExamDepartment } from '../models/index.js';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import mammoth from 'mammoth';
import { sequelize } from '../config/database.js';
import { generateDefaultPassword, generateStudentEmail, extractBatchYearFromRegisterNumber, extractProgramCodeFromRegisterNumber } from '../utils/student.utils.js';

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
        let y = standardDate.getFullYear();
        // Node.js parses 'May 5' as May 5, 2001. We want to default to the current year instead.
        if (y === 2001 && !text.includes('2001')) {
            y = new Date().getFullYear();
        }

        // Fix known typos in the original timetable file (e.g. 2027, 2028 instead of 2026)
        if (y === 2027 || y === 2028) {
            y = 2026;
        }

        return new Date(y, standardDate.getMonth(), standardDate.getDate());
    }

    return null;
};

const formatDateForDb = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const DEPARTMENT_CODE_DISPLAY_NAMES: Record<string, string> = {
    IMCA: 'Integrated MCA',
    EEE: 'Electrical & Electronics Engineering',
    CSE: 'Computer Science & Engineering',
    ECE: 'Electronics & Communication Engineering',
    CE: 'Civil Engineering',
    ME: 'Mechanical Engineering',
    AD: 'Artificial Intelligence & Data Science',
    CA: 'Computer Applications',
    CC: 'Computer Science (Cyber Security)',
    RA: 'Robotics & Automation',
    ER: 'Electronics & Robotics',
};

const normalizeDepartmentCode = (value: unknown): string => {
    let text = String(value ?? '').toUpperCase().trim();
    text = text.replace(/\(.*\)/g, '').trim();
    const parts = text.split(/[\s_]+/);
    let raw = parts[0] ? parts[0].replace(/[^A-Z0-9]/g, '') : '';
    if (!raw) return '';

    const aliases: Record<string, string> = {
        CS: 'CSE', CSE: 'CSE', ITCS: 'CSE', CSEPGR: 'CSE', CSEWP: 'CSE',
        EC: 'ECE', ECE: 'ECE', ITEC: 'ECE', ECEPGL: 'ECE', ECEWP: 'ECE',
        EE: 'EEE', EEE: 'EEE', ITEE: 'EEE', EEEWP: 'EEE',
        ME: 'ME', MECH: 'ME', MEWP: 'ME', MEAMPM: 'ME',
        CE: 'CE', CIVIL: 'CE', ITCE: 'CE', CEWP: 'CE',
        AD: 'AD', AIDS: 'AD', 'AI&DS': 'AD',
        CA: 'CA', MCA: 'CA', INT_MCA: 'CA', IMCA: 'CA', INMCA: 'CA',
        CC: 'CC',
        ER: 'ER', RA: 'ER',
        BHM: 'BHM', MBA: 'MBA', PHD: 'PHD', INT: 'INT'
    };

    if (raw.startsWith('IT') && raw.length > 2 && !aliases[raw]) {
        const withoutIT = raw.slice(2);
        if (aliases[withoutIT] || withoutIT.length >= 2) {
            raw = withoutIT;
        }
    }
    return aliases[raw] || raw;
};

const parseDepartmentCodes = (raw: unknown): string[] => {
    let text = String(raw ?? '').trim().toUpperCase();
    if (!text) return [];

    if (text.includes('ALL BRANCHES') || text === 'ALL' || text === 'ALL_BRANCHES') {
        return ['ALL_BRANCHES'];
    }

    text = text.replace(/\s*\(.*?\)/g, '');
    const tokens = text.split(/[\s,/;&|.\-_]+/);
    const results = new Set<string>();

    for (const token of tokens) {
        const norm = normalizeDepartmentCode(token);
        if (norm && norm !== 'A' && norm !== 'B' && norm !== 'C' && norm !== 'D' && norm !== 'E') {
            results.add(norm);
        }
    }

    return Array.from(results);
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

const normalizeEligibleHeader = (value: unknown) =>
    String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ');

const getEligibleCellValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row || {});
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return row[key];
        }

        const normalizedKey = normalizeEligibleHeader(key);
        const matchKey = rowKeys.find((existingKey) => normalizeEligibleHeader(existingKey) === normalizedKey);
        if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null && String(row[matchKey]).trim() !== '') {
            return row[matchKey];
        }
    }
    return undefined;
};

const parseEligibleWorkbook = (buffer: Buffer, filename: string) => {
    const lowerName = String(filename || '').toLowerCase();
    const workbook = lowerName.endsWith('.csv')
        ? XLSX.read(buffer.toString('utf8'), { type: 'string' })
        : XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('Invalid file: No sheets found');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error('Invalid file: Sheet not found');
    }

    return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
};

const sanitizeEmailToken = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

const buildEligibleStudentEmail = (fullName: string, registerNumber: string) => {
    const joiningYear = extractBatchYearFromRegisterNumber(registerNumber) || new Date().getFullYear();
    const programCode = extractProgramCodeFromRegisterNumber(registerNumber) || 'student';
    return generateStudentEmail(fullName, joiningYear, programCode);
};

const resolveProgramForEligibleImport = async (
    departmentId: number,
    row: any,
    transaction: any
) => {
    const programValue = String(getEligibleCellValue(row, ['Program', 'Program Name', 'Programme', 'Course', 'Branch', 'Stream']) ?? '').trim();
    const programCodeValue = String(getEligibleCellValue(row, ['Program Code', 'Programme Code']) ?? '').trim();

    if (programValue || programCodeValue) {
        const programWhere: any = { DepartmentID: departmentId };
        const programConditions: any[] = [];
        if (programValue) programConditions.push({ ProgramName: programValue });
        if (programCodeValue) programConditions.push({ ProgramCode: programCodeValue });
        if (programConditions.length > 0) {
            programWhere[Op.or] = programConditions;
        }

        const program = await Program.findOne({
            where: programWhere,
            transaction
        });
        if (program) return program;

        return Program.create({
            ProgramName: programValue || programCodeValue || `Program-${Date.now()}`,
            ProgramCode: programCodeValue || `PRG-${departmentId}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
            DepartmentID: departmentId,
            IsActive: true
        } as any, { transaction });
    }

    const fallbackProgram = await Program.findOne({
        where: { DepartmentID: departmentId },
        order: [['ProgramID', 'ASC']],
        transaction
    });

    if (fallbackProgram) return fallbackProgram;

    return Program.create({
        ProgramName: 'Eligible Import Program',
        DepartmentID: departmentId,
        IsActive: true
    } as any, { transaction });
};

const resolveSemesterForEligibleImport = async (programId: number, row: any, transaction: any) => {
    const semesterRaw = getEligibleCellValue(row, ['Semester', 'Sem', 'Term', 'Semester Number']);
    const semesterNumber = semesterRaw !== undefined ? parseInt(String(semesterRaw).match(/\d+/)?.[0] || '', 10) : NaN;

    if (Number.isFinite(semesterNumber) && semesterNumber > 0) {
        const existingSemester = await Semester.findOne({
            where: { ProgramID: programId, SemesterNumber: semesterNumber },
            transaction
        });
        if (existingSemester) return existingSemester;

        return Semester.create({
            ProgramID: programId,
            SemesterNumber: semesterNumber,
            SemesterName: `S${semesterNumber}`,
            IsActive: true
        } as any, { transaction });
    }

    const fallbackSemester = await Semester.findOne({
        where: { ProgramID: programId },
        order: [['SemesterNumber', 'ASC']],
        transaction
    });

    if (fallbackSemester) return fallbackSemester;

    return Semester.create({
        ProgramID: programId,
        SemesterNumber: 1,
        SemesterName: 'S1',
        IsActive: true
    } as any, { transaction });
};

export class ExamController {

    // Get all exams with optional filtering
    static async getExams(req: Request, res: Response) {
        try {
            const { search, status, startDate, endDate, department, seriesId, session } = req.query;

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

            let isInternal = false;
            if (seriesId) {
                whereClause.ExamSeriesID = seriesId;
                const seriesInfo = await ExamSeries.findByPk(seriesId as string);
                if (seriesInfo && seriesInfo.ExamType === 'Internal') {
                    isInternal = true;
                }
            }

            if (session && session !== 'All') {
                whereClause.Session = session;
            }

            if (isInternal) {
                const ieWhere: any = { InternalExamSeriesID: seriesId };
                if (search) {
                    ieWhere[Op.or] = [
                        { SubjectName: { [Op.like]: `%${search}%` } },
                        { SubjectCode: { [Op.like]: `%${search}%` } }
                    ];
                }
                if (session && session !== 'All') {
                    ieWhere.Session = session;
                }
                if (startDate && endDate) {
                    ieWhere.ExamDate = { [Op.between]: [startDate, endDate] };
                }

                const internalExams = await InternalExam.findAll({
                    where: ieWhere,
                    attributes: {
                        include: [
                            [
                                sequelize.literal(`(
                                    SELECT COUNT(*)
                                    FROM InternalExamRegistrations AS ier
                                    WHERE ier.InternalExamID = InternalExam.InternalExamID
                                )`),
                                'registrationCount'
                            ]
                        ]
                    },
                    include: [{
                        model: InternalExamDepartment,
                        include: [{ model: Department, attributes: ['DepartmentID', 'DepartmentName', 'DepartmentCode'] }]
                    }],
                    order: [['ExamDate', 'ASC']]
                });

                const now = new Date();
                const transformed = internalExams.map(ie => {
                    const data = ie.toJSON() as any;

                    const depts = data.InternalExamDepartments || [];
                    const deptName = depts.length > 0 ? depts.map((d: any) => d.Department?.DepartmentCode).filter(Boolean).join(', ') : (data.BranchScope || 'ALL_BRANCHES');
                    const fullDeptName = depts.length > 0 ? depts.map((d: any) => d.Department?.DepartmentName).filter(Boolean).join(', ') : (data.BranchScope || 'All Branches');
                    const mainDeptID = depts[0]?.Department?.DepartmentID || depts[0]?.DepartmentID || undefined;

                    // ── Compute correct branch display ─────────────────────────────────
                    // Priority 1: Use stored Programme field (set by import from v2 onwards)
                    // Priority 2: Derive from SubjectCode pattern (fixes legacy records)
                    // Priority 3: Use raw BranchScope or dept codes (for B.Tech / fallback)
                    let branchDisplay: string;
                    const programme: string | null = data.Programme || null;
                    const subjectCodeUpper = (data.SubjectCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

                    if (programme === 'MCA') {
                        // MCA master's programme – branch = 'MCA'
                        branchDisplay = 'MCA';
                    } else if (programme === 'Integrated MCA') {
                        // Integrated MCA – branch = 'Int. MCA' (timetable standard abbreviation)
                        branchDisplay = 'Int. MCA';
                    } else if (programme === 'M.Tech') {
                        branchDisplay = 'M.Tech';
                    } else if (!programme) {
                        // Legacy record – Programme not yet stored. Derive from SubjectCode.
                        if (subjectCodeUpper.includes('INMCA') || subjectCodeUpper.includes('IMCA') || subjectCodeUpper.includes('INTMCA')) {
                            branchDisplay = 'Int. MCA';
                        } else if (subjectCodeUpper.includes('MCA')) {
                            branchDisplay = 'MCA';
                        } else if (subjectCodeUpper.includes('MTECH') || subjectCodeUpper.includes('MTECH')) {
                            branchDisplay = 'M.Tech';
                        } else {
                            // B.Tech or unknown – use BranchScope (normalize spacing), else dept codes
                            const bs = String(data.BranchScope || '').trim();
                            branchDisplay = bs
                                ? bs.split(',').map((s: string) => s.trim()).filter(Boolean).join(', ')
                                : depts.length > 0
                                    ? depts.map((d: any) => d.Department?.DepartmentCode).filter(Boolean).join(', ')
                                    : '';
                        }
                    } else {
                        // B.Tech, MBA, BHM, or other programme – branch = specific dept codes from timetable
                        const bs = String(data.BranchScope || '').trim();
                        branchDisplay = bs
                            ? bs.split(',').map((s: string) => s.trim()).filter(Boolean).join(', ')
                            : depts.length > 0
                                ? depts.map((d: any) => d.Department?.DepartmentCode).filter(Boolean).join(', ')
                                : '';
                    }
                    // ──────────────────────────────────────────────────────────────────

                    const examDate = new Date(data.ExamDate);
                    const startHour = data.Session === 'FN' ? 10 : 14;
                    const examStart = new Date(examDate);
                    examStart.setHours(startHour, 0, 0, 0);
                    const examEnd = new Date(examStart.getTime() + (data.Duration || 150) * 60 * 1000);

                    let calcStatus = 'Scheduled';
                    if (now >= examEnd) calcStatus = 'Completed';
                    else if (now >= examStart && now < examEnd) calcStatus = 'In Progress';

                    if (status && status !== 'All' && calcStatus !== status) return null;

                    return {
                        ExamID: data.InternalExamID,
                        ExamName: data.SubjectName,
                        Semester: data.Semester,
                        ExamDate: data.ExamDate,
                        Session: data.Session,
                        Duration: data.Duration || 150,
                        Status: calcStatus,
                        DepartmentID: mainDeptID,
                        BranchScope: branchDisplay || null,
                        registrationCount: Number(data.registrationCount || 0),
                        Subject: {
                            SubjectName: data.SubjectName,
                            SubjectCode: data.SubjectCode,
                            Semester: data.Semester,
                            DepartmentID: mainDeptID,
                            Department: {
                                DepartmentID: mainDeptID,
                                DepartmentName: fullDeptName,
                                DepartmentCode: deptName
                            }
                        },
                        Enrollment: 0,
                        AuditStatus: 'Clean'
                    };
                }).filter(Boolean);

                return res.json(transformed);
            }

            const exams = await Exam.findAll({
                where: whereClause,
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
                        where: subjectWhereClause,
                        attributes: ['SubjectName', 'SubjectCode', 'DepartmentID'],
                        include: [
                            {
                                model: Department,
                                attributes: ['DepartmentID', 'DepartmentName', 'DepartmentCode']
                            },
                            {
                                model: Semester,
                                attributes: ['SemesterID', 'SemesterName', 'SemesterNumber'],
                                include: [
                                    {
                                        model: Program,
                                        attributes: ['ProgramID', 'ProgramName', 'ProgramCode']
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: ExamSeries,
                        attributes: ['SeriesName', 'ExamSeriesID', 'ExamType']
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
            let { SubjectID, ExamName, ExamDate, Session, Duration, ExamSeriesID, DepartmentID } = req.body;

            // Basic validation
            if (!SubjectID || !ExamDate || !Session || !Duration) {
                return res.status(400).json({ message: 'Missing required fields (Subject, Exam Date, Session, or Duration)' });
            }

            if (!ExamName && SubjectID) {
                const sub = await Subject.findByPk(SubjectID);
                ExamName = sub ? sub.SubjectName : 'Scheduled Exam';
            }

            // Validate ExamSeriesID if provided
            if (ExamSeriesID) {
                const series = await ExamSeries.findByPk(ExamSeriesID);
                if (!series) {
                    return res.status(400).json({ message: 'Invalid Exam Series ID' });
                }
            }

            let finalSubjectId = SubjectID;

            if (DepartmentID !== undefined && DepartmentID !== null && String(DepartmentID).trim() !== '') {
                const departmentIdNum = Number(DepartmentID);
                if (!Number.isFinite(departmentIdNum)) {
                    return res.status(400).json({ message: 'Invalid DepartmentID' });
                }

                const department = await Department.findByPk(departmentIdNum);
                if (!department) {
                    return res.status(404).json({ message: 'Department not found' });
                }

                const currentSubject = await Subject.findByPk(SubjectID);
                if (!currentSubject) {
                    return res.status(404).json({ message: 'Current subject not found for exam' });
                }

                const [targetSubject] = await Subject.findOrCreate({
                    where: {
                        SubjectCode: currentSubject.SubjectCode,
                        DepartmentID: departmentIdNum
                    },
                    defaults: {
                        SubjectCode: currentSubject.SubjectCode,
                        SubjectName: currentSubject.SubjectName,
                        DepartmentID: departmentIdNum,
                        SemesterID: currentSubject.SemesterID || 1
                    }
                });

                finalSubjectId = targetSubject.SubjectID;
            }

            // Determine status based on date (simple logic for now)
            const examDateObj = new Date(ExamDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let status = 'Scheduled';
            if (examDateObj < today) {
                status = 'Completed';
            }

            const payload: any = {
                SubjectID: Number(finalSubjectId),
                ExamName,
                ExamDate,
                Session,
                Duration: Number(Duration),
                Status: status,
                IsEmergencyMode: false,
                AttendanceLocked: false
            };

            if (ExamSeriesID) {
                payload.ExamSeriesID = parseInt(String(ExamSeriesID));
            }

            const newExam = await Exam.create(payload);

            res.status(201).json(newExam);
        } catch (error: any) {
            console.error("Error creating exam:", error);
            res.status(500).json({ message: 'Error creating exam', error: error.message });
        }
    }

    // Update an exam
    static async updateExam(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = { ...req.body };

            let exam = await Exam.findByPk(id as string);
            if (!exam) {
                // If not found in standard Exams, try InternalExams fallback
                const internalExam = await InternalExam.findByPk(id as string);
                if (!internalExam) {
                    return res.status(404).json({ message: 'Exam not found' });
                }

                // Update internal exam fields
                const { SubjectID, ExamDate, Session, Duration, DepartmentID } = updates;

                const internalUpdates: any = {};
                if (ExamDate !== undefined) internalUpdates.ExamDate = ExamDate;
                if (Session !== undefined) internalUpdates.Session = Session;
                if (Duration !== undefined) internalUpdates.Duration = Number(Duration);

                // If SubjectID is supplied, find the Subject and sync SubjectCode & SubjectName
                if (SubjectID !== undefined && SubjectID !== null && String(SubjectID).trim() !== '') {
                    const subject = await Subject.findByPk(Number(SubjectID));
                    if (!subject) {
                        return res.status(404).json({ message: 'Subject not found' });
                    }
                    internalUpdates.SubjectCode = subject.SubjectCode;
                    internalUpdates.SubjectName = subject.SubjectName;
                }

                await internalExam.update(internalUpdates);

                // Sync DepartmentID in InternalExamDepartments mapping
                if (DepartmentID !== undefined && DepartmentID !== null && String(DepartmentID).trim() !== '') {
                    const departmentId = Number(DepartmentID);
                    const department = await Department.findByPk(departmentId);
                    if (!department) {
                        return res.status(404).json({ message: 'Department not found' });
                    }

                    // Delete existing department mappings for this internal exam
                    await sequelize.query('DELETE FROM InternalExamDepartments WHERE InternalExamID = :id', {
                        replacements: { id: internalExam.InternalExamID },
                        type: QueryTypes.DELETE
                    });

                    // Add the new department mapping
                    await sequelize.query(
                        'INSERT INTO InternalExamDepartments (InternalExamID, DepartmentID, createdAt, updatedAt) VALUES (:examId, :deptId, NOW(), NOW())',
                        {
                            replacements: { examId: internalExam.InternalExamID, deptId: departmentId },
                            type: QueryTypes.INSERT
                        }
                    );
                }

                // Query the updated record to format it compatibly with standard Exam object for frontend
                const updatedInternalExam = await InternalExam.findByPk(id as string, {
                    include: [{
                        model: InternalExamDepartment,
                        include: [{ model: Department, attributes: ['DepartmentName', 'DepartmentCode'] }]
                    }]
                });

                if (!updatedInternalExam) {
                    return res.status(404).json({ message: 'Error retrieving updated internal exam' });
                }

                const data = updatedInternalExam.toJSON() as any;
                const depts = data.InternalExamDepartments || [];
                const deptName = depts.length > 0 ? depts.map((d: any) => d.Department?.DepartmentCode).join(', ') : 'ALL_BRANCHES';
                const fullDeptName = depts.length > 0 ? depts.map((d: any) => d.Department?.DepartmentName).join(', ') : 'All Branches';

                const now = new Date();
                const examDate = new Date(data.ExamDate);
                const startHour = data.Session === 'FN' ? 10 : 14;
                const examStart = new Date(examDate);
                examStart.setHours(startHour, 0, 0, 0);
                const examEnd = new Date(examStart.getTime() + (data.Duration || 150) * 60 * 1000);

                let calcStatus = 'Scheduled';
                if (now >= examEnd) calcStatus = 'Completed';
                else if (now >= examStart && now < examEnd) calcStatus = 'In Progress';

                return res.json({
                    ExamID: data.InternalExamID,
                    ExamName: data.SubjectName,
                    ExamDate: data.ExamDate,
                    Session: data.Session,
                    Duration: data.Duration || 150,
                    Status: calcStatus,
                    Subject: {
                        SubjectName: data.SubjectName,
                        SubjectCode: data.SubjectCode,
                        Department: {
                            DepartmentName: fullDeptName,
                            DepartmentCode: deptName
                        }
                    },
                    Enrollment: 0,
                    AuditStatus: 'Clean'
                });
            }

            // Otherwise, handle standard Exam update logic
            let finalSubjectId = exam.SubjectID;
            if (updates.SubjectID !== undefined && updates.SubjectID !== null && String(updates.SubjectID).trim() !== '') {
                finalSubjectId = Number(updates.SubjectID);
            }

            const departmentIdRaw = updates.DepartmentID;
            delete updates.DepartmentID;

            if (departmentIdRaw !== undefined && departmentIdRaw !== null && String(departmentIdRaw).trim() !== '') {
                const departmentId = Number(departmentIdRaw);
                if (!Number.isFinite(departmentId)) {
                    return res.status(400).json({ message: 'Invalid DepartmentID' });
                }

                const department = await Department.findByPk(departmentId);
                if (!department) {
                    return res.status(404).json({ message: 'Department not found' });
                }

                const currentSubject = await Subject.findByPk(finalSubjectId);
                if (!currentSubject) {
                    return res.status(404).json({ message: 'Current subject not found for exam' });
                }

                const [targetSubject] = await Subject.findOrCreate({
                    where: {
                        SubjectCode: currentSubject.SubjectCode,
                        DepartmentID: departmentId
                    },
                    defaults: {
                        SubjectCode: currentSubject.SubjectCode,
                        SubjectName: currentSubject.SubjectName,
                        DepartmentID: departmentId,
                        SemesterID: currentSubject.SemesterID
                    }
                });

                updates.SubjectID = targetSubject.SubjectID;
            }

            await exam.update(updates);

            const updatedExam = await Exam.findByPk(exam.ExamID, {
                include: [
                    {
                        model: Subject,
                        include: [
                            {
                                model: Department,
                                attributes: ['DepartmentID', 'DepartmentName', 'DepartmentCode']
                            }
                        ]
                    }
                ]
            });

            res.json(updatedExam);
        } catch (error: any) {
            res.status(500).json({ message: 'Error updating exam', error: error.message });
        }
    }

    // Delete an exam
    static async deleteExam(req: Request, res: Response) {
        try {
            const { id } = req.params;
            let exam = await Exam.findByPk(id as string);

            if (!exam) {
                const internalExam = await InternalExam.findByPk(id as string);
                if (internalExam) {
                    await sequelize.query('DELETE FROM InternalSeatAllocations WHERE InternalExamID = :id', {
                        replacements: { id: internalExam.InternalExamID },
                        type: QueryTypes.DELETE
                    });
                    await sequelize.query('DELETE FROM InternalExamRegistrations WHERE InternalExamID = :id', {
                        replacements: { id: internalExam.InternalExamID },
                        type: QueryTypes.DELETE
                    });
                    await sequelize.query('DELETE FROM InternalExamDepartments WHERE InternalExamID = :id', {
                        replacements: { id: internalExam.InternalExamID },
                        type: QueryTypes.DELETE
                    });
                    await internalExam.destroy();
                    return res.json({ message: 'Exam deleted successfully' });
                }
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

    static async clearEligibility(req: Request, res: Response) {
        try {
            const { seriesId, date } = req.query;
            let query = 'DELETE FROM ExamRegistrations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE 1=1';
            const replacements: any = {};

            if (seriesId) {
                query += ' AND ExamSeriesID = :seriesId';
                replacements.seriesId = parseInt(String(seriesId), 10);
            }
            if (date) {
                query += ' AND ExamDate = :date';
                replacements.date = date;
            }
            query += ')';

            // Delete associated seat allocations first to prevent foreign key errors
            let seatQuery = 'DELETE FROM SeatAllocations WHERE ExamID IN (SELECT ExamID FROM Exams WHERE 1=1';
            if (seriesId) seatQuery += ' AND ExamSeriesID = :seriesId';
            if (date) seatQuery += ' AND ExamDate = :date';
            seatQuery += ')';

            await sequelize.query(seatQuery, { replacements, type: QueryTypes.DELETE });

            await sequelize.query(query, {
                replacements,
                type: QueryTypes.DELETE
            });

            res.json({ message: 'Eligibility list cleared successfully' });
        } catch (error: any) {
            console.error('Clear eligibility error:', error);
            res.status(500).json({ message: 'Error clearing eligibility list', error: error.message });
        }
    }

    static async deleteEligibility(req: Request, res: Response) {
        try {
            const examId = Number(req.params.examId);
            const studentId = Number(req.params.studentId);

            if (isNaN(examId) || isNaN(studentId)) {
                return res.status(400).json({ message: 'Invalid exam or student ID' });
            }

            // Also delete associated seat allocations if any
            await sequelize.query(`
                DELETE FROM SeatAllocations 
                WHERE ExamID = :examId AND StudentID = :studentId
            `, {
                replacements: { examId, studentId },
                type: QueryTypes.DELETE
            });

            const deleted = await ExamRegistration.destroy({
                where: {
                    ExamID: examId,
                    StudentID: studentId
                }
            });

            if (!deleted) {
                return res.status(404).json({ message: 'Eligibility record not found' });
            }

            res.json({ message: 'Eligibility deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting eligibility:', error);
            res.status(500).json({ message: 'Failed to delete eligibility', error: error.message });
        }
    }

    static async clearSingleExamEligibility(req: Request, res: Response) {
        try {
            const examId = Number(req.params.id);
            if (isNaN(examId)) {
                return res.status(400).json({ message: 'Invalid exam ID' });
            }

            // Delete associated seat allocations first
            await sequelize.query(`
                DELETE FROM SeatAllocations WHERE ExamID = :examId
            `, {
                replacements: { examId },
                type: QueryTypes.DELETE
            });

            await ExamRegistration.destroy({
                where: { ExamID: examId }
            });

            res.json({ message: 'Exam eligibility cleared successfully' });
        } catch (error: any) {
            console.error('Error clearing exam eligibility:', error);
            res.status(500).json({ message: 'Failed to clear exam eligibility', error: error.message });
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
                const seriesInfo = await ExamSeries.findByPk(parsedSeriesId);
                if (seriesInfo && seriesInfo.ExamType === 'Internal') {
                    // Internal series cleanup: SeatAllocations -> Snapshots -> ExamRegistrations -> Eligibilities -> ExamDepartments -> InternalExams
                    await sequelize.query(
                        'DELETE FROM InternalSeatAllocations WHERE SnapshotID IN (SELECT SnapshotID FROM InternalSeatSnapshots WHERE SeriesID = :seriesId) OR InternalExamID IN (SELECT InternalExamID FROM InternalExams WHERE InternalExamSeriesID = :seriesId)',
                        {
                            replacements: { seriesId: parsedSeriesId },
                            type: QueryTypes.DELETE
                        }
                    );
                    await sequelize.query(
                        'DELETE FROM InternalSeatSnapshots WHERE SeriesID = :seriesId',
                        {
                            replacements: { seriesId: parsedSeriesId },
                            type: QueryTypes.DELETE
                        }
                    );
                    await sequelize.query(
                        'DELETE FROM InternalExamRegistrations WHERE InternalExamID IN (SELECT InternalExamID FROM InternalExams WHERE InternalExamSeriesID = :seriesId)',
                        {
                            replacements: { seriesId: parsedSeriesId },
                            type: QueryTypes.DELETE
                        }
                    );
                    await sequelize.query(
                        'DELETE FROM InternalSubjectEligibility WHERE InternalExamSeriesID = :seriesId',
                        {
                            replacements: { seriesId: parsedSeriesId },
                            type: QueryTypes.DELETE
                        }
                    );
                    await sequelize.query(
                        'DELETE FROM InternalExamDepartments WHERE InternalExamID IN (SELECT InternalExamID FROM InternalExams WHERE InternalExamSeriesID = :seriesId)',
                        {
                            replacements: { seriesId: parsedSeriesId },
                            type: QueryTypes.DELETE
                        }
                    );
                    const deletedCount = await InternalExam.destroy({ where: { InternalExamSeriesID: parsedSeriesId } });
                    return res.json({
                        message: 'All exams deleted successfully',
                        deletedCount
                    });
                }

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

            let isInternal = false;
            if (seriesId) {
                whereClause.ExamSeriesID = seriesId;
                const seriesInfo = await ExamSeries.findByPk(seriesId as string);
                if (seriesInfo && seriesInfo.ExamType === 'Internal') {
                    isInternal = true;
                }
            }

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

            if (isInternal) {
                const ieWhere: any = { InternalExamSeriesID: seriesId };
                const totalExams = await InternalExam.count({ where: ieWhere });
                const completedExams = await InternalExam.count({
                    where: { ...ieWhere, ExamDate: { [Op.lt]: todayStr } }
                });
                const upcomingExams = await InternalExam.count({
                    where: { ...ieWhere, ExamDate: { [Op.gt]: todayStr } }
                });
                const activeToday = await InternalExam.count({
                    where: { ...ieWhere, ExamDate: todayStr }
                });
                return res.json({
                    total: totalExams,
                    completed: completedExams,
                    upcoming: upcomingExams,
                    activeToday: activeToday
                });
            }

            const totalExams = await Exam.count({ where: whereClause });

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

            // Pre-load existing data to avoid redundant queries (No transaction needed for initial load)
            const deptCache = new Map<string, number>();
            const subjectCache = new Map<string, number>();

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

            // Get or create default semester for subject assignment during import
            let defaultSemesterID = 1;
            let anySemester = await Semester.findOne();

            if (anySemester) {
                defaultSemesterID = anySemester.SemesterID;
            } else {
                // We need a program to create a semester
                let program = await Program.findOne();
                if (!program) {
                    program = await Program.create({
                        ProgramName: 'General Program',
                        ProgramCode: 'GEN-P',
                        DepartmentID: fallbackDepartmentID,
                        IsActive: true
                    } as any);
                }

                try {
                    const newSem = await Semester.create({
                        SemesterNumber: 1,
                        SemesterName: "Semester 1",
                        ProgramID: program.ProgramID,
                        IsActive: true
                    });
                    defaultSemesterID = newSem.SemesterID;
                    console.log(`[importTimetable] Created default semester ID ${defaultSemesterID}`);
                } catch (e: any) {
                    console.warn("[importTimetable] Could not create default semester:", e.message);
                }
            }

            let successCount = 0;
            let updatedCount = 0;
            let errors: string[] = [];

            const existingSubjects = await Subject.findAll();
            existingSubjects.forEach(s => subjectCache.set(`${s.SubjectCode}::${s.DepartmentID}`, s.SubjectID));

            for (const row of data) {
                try {
                    // Robust Column Mapping - handle various naming conventions
                    const getVal = (keys: string[]) => {
                        for (const k of keys) {
                            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
                        }
                        // Try lowercase variants
                        const lowerKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
                        for (const actualKey of Object.keys(row)) {
                            const normalizedActual = actualKey.toLowerCase().replace(/\s+/g, '');
                            if (lowerKeys.includes(normalizedActual)) {
                                if (row[actualKey] !== undefined && row[actualKey] !== null && String(row[actualKey]).trim() !== '') return row[actualKey];
                            }
                        }
                        return undefined;
                    };

                    const deptRaw = getVal(['Branches', 'Branch', 'DepartmentCode', 'Department Code', 'Department', 'Dept']);
                    const codeRaw = getVal(['Course Code', 'SubjectCode', 'Subject Code', 'Code', 'CourseCode']);
                    const nameRaw = getVal(['Course Name', 'SubjectName', 'Subject Name', 'Examination Name', 'ExaminationName', 'Name', 'CourseName']);
                    const dateRaw = getVal(['Date', 'ExamDate', 'Exam Date']);
                    const timeRaw = getVal(['Time', 'Session', 'ExamTime']);
                    const sessionRaw = getVal(['Session']);
                    const durationRaw = getVal(['Duration']);

                    const code = codeRaw ? String(codeRaw).trim() : null;
                    const subjectName = nameRaw ? String(nameRaw).trim() : (code || 'Unknown Subject');

                    if (!code || !dateRaw) {
                        if (!code && !dateRaw) continue; // Skip empty rows silently
                        throw new Error(`Row missing Code or Date. Code: ${code}, Date: ${dateRaw}`);
                    }

                    const cleanCode = String(code).trim();
                    const examDate = parseExamDateValue(dateRaw);

                    if (!examDate) {
                        throw new Error(`Invalid Date format for '${cleanCode}': ${dateRaw}`);
                    }
                    const formattedDate = formatDateForDb(examDate);

                    // Parse Session and Duration
                    let session = 'FN';
                    let duration: number = typeof durationRaw === 'number' ? durationRaw : 150;

                    const explicitSession = sessionRaw ? String(sessionRaw).trim().toUpperCase() : '';
                    if (explicitSession === 'FN' || explicitSession === 'AN') {
                        session = explicitSession;
                    } else if (timeRaw) {
                        const timeStr = String(timeRaw).toLowerCase();
                        if (timeStr.includes('fn')) session = 'FN';
                        else if (timeStr.includes('an')) session = 'AN';
                        else if (timeStr.includes('am') || timeStr.includes('pm') || timeStr.includes('-') || timeStr.includes('–') || timeStr.includes('—')) {
                            const parts = timeStr.split(/[-–—]/);
                            const startPart = (parts[0] || '').trim();
                            if (startPart.includes('pm')) {
                                session = 'AN';
                            } else if (startPart.includes('am')) {
                                session = 'FN';
                            } else if (startPart) {
                                const hourMatch = startPart.match(/(\d+)/);
                                if (hourMatch && hourMatch[1]) {
                                    const h = parseInt(hourMatch[1]);
                                    if (h >= 12 || (h >= 1 && h <= 6)) session = 'AN';
                                    else session = 'FN';
                                }
                            }
                        }
                    }

                    // Auto-infer duration if missing
                    if (timeRaw && typeof durationRaw === 'undefined') {
                        const t = String(timeRaw).toLowerCase();
                        if (t.includes('12:00') || t.includes('12:30') || t.includes('4:00')) {
                            duration = 150;
                        } else if (t.includes('1:00') || t.includes('4:30') || t.includes('12:30')) {
                            duration = 180;
                        }
                    }

                    const deptCodesFromRow = parseDepartmentCodes(deptRaw);
                    const deptCodeFromCourse = inferDepartmentCodeFromCourseCode(cleanCode);
                    const deptCodes = deptCodesFromRow.length > 0
                        ? deptCodesFromRow
                        : (deptCodeFromCourse ? [deptCodeFromCourse] : []);
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

                        // 1.5 Resolve Program and Semester based on row data
                        let rowSemesterID: number = defaultSemesterID;

                        // Robustly find column values regardless of slight header variations
                        const getRowVal = (keys: string[]) => {
                            for (const key of keys) {
                                if (row[key] !== undefined) return row[key];
                            }
                            const lowerKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
                            for (const actualKey of Object.keys(row)) {
                                if (lowerKeys.includes(actualKey.toLowerCase().replace(/\s+/g, ''))) {
                                    return row[actualKey];
                                }
                            }
                            return undefined;
                        };

                        const examTypeRaw = getRowVal(['Exam Type', 'ExamType', 'Semester', 'Exam_Type']);
                        const programmeRaw = getRowVal(['Programme', 'Program']);

                        if (programmeRaw || examTypeRaw) {
                            const progName = programmeRaw ? String(programmeRaw).trim() : 'General Program';

                            let prog = await Program.findOne({
                                where: { ProgramName: progName, DepartmentID: departmentID }
                            });

                            if (!prog) {
                                const baseCode = progName.replace(/\s+/g, '-').substring(0, 15).toUpperCase();
                                const progCode = `${baseCode}-${departmentID}`;
                                prog = await Program.create({
                                    ProgramName: progName,
                                    ProgramCode: progCode,
                                    DepartmentID: departmentID,
                                    IsActive: true
                                } as any);
                            }

                            const semName = examTypeRaw ? String(examTypeRaw).trim() : 'Semester 1';
                            let semNum = 1;
                            const semMatch = semName.match(/[sS](\d+)/);
                            if (semMatch && semMatch[1]) {
                                semNum = parseInt(semMatch[1], 10);
                            }

                            let [sem] = await Semester.findOrCreate({
                                where: {
                                    SemesterName: semName,
                                    ProgramID: prog.ProgramID
                                },
                                defaults: {
                                    SemesterName: semName,
                                    SemesterNumber: semNum,
                                    ProgramID: prog.ProgramID,
                                    IsActive: true
                                } as any
                            });

                            rowSemesterID = sem.SemesterID;
                        }

                        // 2. Resolve Subject (Find or Create) per dept
                        let subjectID: number;
                        const subjectKey = `${cleanCode}::${departmentID}`;
                        const cachedSubjID = subjectCache.get(subjectKey);

                        // Defensive check: Ensure SemesterID is valid
                        if (!rowSemesterID || isNaN(Number(rowSemesterID))) {
                            const errMsg = `Row ${data.indexOf(row) + 2}: Missing or invalid SemesterID for Subject '${cleanCode}' (DepartmentID: ${departmentID}). Subject not created.`;
                            console.error(errMsg);
                            errors.push(errMsg);
                            continue;
                        }

                        if (cachedSubjID !== undefined) {
                            subjectID = cachedSubjID;

                            // Optionally update the subject's semester if it was assigned to default before
                            await Subject.update(
                                { SemesterID: rowSemesterID } as any,
                                { where: { SubjectID: subjectID } }
                            );
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
                                    SemesterID: rowSemesterID
                                } as any
                            });
                            subjectID = subj.SubjectID;
                            subjectCache.set(subjectKey, subjectID);

                            // If the subject already existed but was found by findOrCreate (race condition), update it
                            if (!subj.isNewRecord && subj.SemesterID !== rowSemesterID) {
                                await subj.update({ SemesterID: rowSemesterID } as any);
                            }
                        }

                        // 3. Upsert exam for this subject/department
                        // We use SubjectID, Date, and Session as the unique identifier for an exam in a series.
                        // This prevents different subjects or different sessions from overwriting each other.
                        const whereClause: any = {
                            SubjectID: subjectID,
                            ExamDate: formattedDate,
                            Session: session.toUpperCase()
                        };

                        if (seriesId) {
                            whereClause.ExamSeriesID = parseInt(String(seriesId));
                        }

                        const existingExam = await Exam.findOne({
                            where: whereClause
                        });

                        const examStatus = new Date(formattedDate) < new Date() ? 'Completed' : 'Scheduled';

                        if (existingExam) {
                            await existingExam.update({
                                ExamName: subjectName,
                                Duration: duration,
                                ExamSeriesID: seriesId ? parseInt(String(seriesId)) : (existingExam.ExamSeriesID || null),
                                Status: examStatus,
                                UpdatedAt: new Date()
                            } as any);
                            updatedCount++;
                        } else {
                            await Exam.create({
                                SubjectID: subjectID,
                                ExamSeriesID: seriesId ? parseInt(String(seriesId)) : undefined,
                                ExamName: subjectName,
                                ExamDate: formattedDate as any,
                                Session: session.toUpperCase(),
                                Duration: duration,
                                Status: examStatus
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

    static async importEligibleStudents(req: Request, res: Response) {
        const examId = Number(req.params.id);
        if (!Number.isFinite(examId)) {
            return res.status(400).json({ message: 'Invalid exam id' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            const exam = await Exam.findByPk(examId, {
                include: [{
                    model: Subject,
                    attributes: ['SubjectID', 'SubjectCode', 'SubjectName', 'DepartmentID'],
                    include: [{
                        model: Department,
                        attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName']
                    }]
                }]
            });

            if (!exam) {
                return res.status(404).json({ message: 'Exam not found' });
            }

            const subject: any = (exam as any).Subject;
            const department: any = subject?.Department;
            if (!subject || !department) {
                return res.status(400).json({ message: 'Exam branch information is missing' });
            }

            const rows = parseEligibleWorkbook(req.file.buffer, req.file.originalname);
            if (!rows.length) {
                return res.status(400).json({ message: 'No student rows found in uploaded file' });
            }

            const transaction = await sequelize.transaction();
            try {
                const result = await ExamController._processEligibleStudentsRows(
                    examId,
                    rows,
                    transaction,
                    department.DepartmentID
                );
                await transaction.commit();

                // ── STEP 4: Return enriched summary ──
                return res.json({
                    message: 'Students imported successfully',
                    examId,
                    branch: {
                        DepartmentID: department.DepartmentID,
                        DepartmentCode: department.DepartmentCode,
                        DepartmentName: department.DepartmentName
                    },
                    ...result
                });
            } catch (error: any) {
                await transaction.rollback();
                throw error;
            }
        } catch (error: any) {
            console.error('importEligibleStudents error:', error);
            return res.status(500).json({
                message: 'Failed to import eligible students',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    static async _processEligibleStudentsRows(examId: number, rows: any[], transaction: any, defaultDepartmentId?: number) {
        const seenRegNos = new Set<string>();
        const errors: Array<{ row: number; reason: string }> = [];
        let createdUsers = 0;
        let updatedUsers = 0;
        let createdStudents = 0;
        let updatedStudents = 0;
        let registrationsCreated = 0;
        let registrationsUpdated = 0;
        let registrationsSkipped = 0;
        let eligibleCount = 0;
        let ineligibleCount = 0;

        const INELIGIBLE_VALUES = new Set(['no', 'not eligible', '0', 'false', 'ineligible']);

        // ── PRE-STEP: Fetch current exam details for session conflict check ──
        const currentExam = await Exam.findByPk(examId, { transaction });
        if (!currentExam) throw new Error("Exam not found during import");

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowNumber = index + 2;

            const fullName = String(getEligibleCellValue(row, ['Name', 'Student Name', 'Full Name', 'FullName']) ?? '').trim();
            const registerNumber = String(getEligibleCellValue(row, ['Register Number', 'RegisterNumber', 'Reg No', 'RegNo', 'University RegNo', 'University Registration No']) ?? '').trim();

            const isEligibleRaw = String(
                getEligibleCellValue(row, ['Is Eligible', 'IsEligible', 'Eligible', 'isEligible', 'Eligibility', 'Status']) ?? ''
            ).trim().toLowerCase();
            const isEligible: boolean = isEligibleRaw === ''
                ? true
                : !INELIGIBLE_VALUES.has(isEligibleRaw);

            if (!fullName || !registerNumber) {
                errors.push({ row: rowNumber, reason: 'Missing required Name or Register Number' });
                continue;
            }

            const normalizedRegNo = registerNumber.toUpperCase();
            if (seenRegNos.has(normalizedRegNo)) {
                continue;
            }
            seenRegNos.add(normalizedRegNo);

            if (isEligible) { eligibleCount++; } else { ineligibleCount++; }

            // ── STEP 1: FIND OR CREATE STUDENT (SMART UPSERT) ──
            let student = await Student.findOne({
                where: { RegisterNumber: normalizedRegNo },
                include: [{ model: User }],
                transaction
            });

            if (!student) {
                // NEW STUDENT: Create User first
                const plainPassword = generateDefaultPassword(fullName, normalizedRegNo);
                const hashedPassword = await bcrypt.hash(plainPassword, 12);

                // Extract email or generate a fallback
                const emailRaw = String(getEligibleCellValue(row, ['Email', 'Email Address', 'EmailAddress']) ?? '').trim();
                let studentEmail = (emailRaw && emailRaw.includes('@'))
                    ? emailRaw.toLowerCase()
                    : null;

                if (!studentEmail) {
                    const joiningYear = extractBatchYearFromRegisterNumber(normalizedRegNo) || new Date().getFullYear();
                    const programCode = extractProgramCodeFromRegisterNumber(normalizedRegNo) || 'student';
                    studentEmail = generateStudentEmail(fullName, joiningYear, programCode);
                }

                let user = await User.findOne({ where: { Email: studentEmail }, transaction });

                if (!user) {
                    user = await User.create({
                        Email: studentEmail,
                        FullName: fullName,
                        PasswordHash: hashedPassword,
                        Role: 'student',
                        IsActive: true,
                        IsPasswordChanged: false,
                        IsActivated: false,
                        FailedLoginAttempts: 0,
                        AccountLockedUntil: null
                    } as any, { transaction });
                    createdUsers++;
                } else {
                    // Update user's name if needed
                    if (user.FullName !== fullName) {
                        await user.update({ FullName: fullName }, { transaction });
                        updatedUsers++;
                    }
                    
                    // Force update password to default if it's not changed yet
                    if (!user.IsPasswordChanged) {
                        const plainPassword = generateDefaultPassword(fullName, normalizedRegNo);
                        const hashedPassword = await bcrypt.hash(plainPassword, 12);
                        await user.update({ PasswordHash: hashedPassword }, { transaction });
                        console.log(`[Import] Updated default password for user: ${user.Email}`);
                    }
                }

                // Resolve Department, Program, Semester for the NEW student
                const deptId = defaultDepartmentId;
                let progId = undefined;
                let semId = undefined;
                let batchYearForEmail = extractBatchYearFromRegisterNumber(normalizedRegNo) || new Date().getFullYear();
                let programCodeForEmail = extractProgramCodeFromRegisterNumber(normalizedRegNo) || 'STUDENT';

                if (deptId) {
                    try {
                        const program = await resolveProgramForEligibleImport(deptId, row, transaction);
                        progId = program.ProgramID;
                        const semester = await resolveSemesterForEligibleImport(progId, row, transaction);
                        semId = semester.SemesterID;

                        // Update user email with proper institutional email if not provided in import
                        if (!emailRaw || !emailRaw.includes('@')) {
                            try {
                                const generatedEmail = generateStudentEmail(
                                    fullName,
                                    batchYearForEmail,
                                    programCodeForEmail,
                                    program.DurationYears || 2
                                );

                                // Check if this email is already taken by ANOTHER user
                                const existingEmailUser = await User.findOne({
                                    where: {
                                        Email: generatedEmail,
                                        UserID: { [Op.ne]: user.UserID }
                                    },
                                    transaction
                                });

                                if (!existingEmailUser) {
                                    await user.update({ Email: generatedEmail }, { transaction });
                                } else {
                                    console.warn(`[Import] Institutional email ${generatedEmail} already taken, keeping fallback ${user.Email}`);
                                }
                            } catch (emailErr: any) {
                                console.warn('[Import] Failed to update institutional email:', emailErr.message);
                            }
                        }
                    } catch (e) {
                        console.warn('Error resolving academic details for row:', rowNumber);
                    }
                }

                student = await Student.create({
                    RegisterNumber: normalizedRegNo,
                    FullName: fullName,
                    UserID: user.UserID,
                    Status: 'ACTIVE',
                    DepartmentID: deptId,
                    ProgramID: progId,
                    SemesterID: semId,
                    BatchYear: batchYearForEmail
                } as any, { transaction });

                createdStudents++;
            } else {
                // EXISTING STUDENT: Update details if they have changed (Case 2/3)
                const updates: any = { Status: 'ACTIVE' };
                if (student.FullName !== fullName) updates.FullName = fullName;

                // Only update academic details if the row provides them or they are currently missing
                const deptId = defaultDepartmentId;
                if (deptId && !student.DepartmentID) updates.DepartmentID = deptId;

                await student.update(updates, { transaction });

                // Also update user's full name if it changed
                if (student.User && student.User.FullName !== fullName) {
                    await student.User.update({ FullName: fullName }, { transaction });
                    updatedUsers++;
                }

                updatedStudents++;
            }

            // ── STEP 2: SESSION CONFLICT CHECK (LOG WARNING) ──
            const sessionConflict = await ExamRegistration.findOne({
                include: [{
                    model: Exam,
                    where: {
                        ExamDate: currentExam.ExamDate,
                        Session: currentExam.Session,
                        ExamID: { [Op.ne]: examId } // Different exam
                    }
                }],
                where: { StudentID: student.StudentID },
                transaction
            });

            if (sessionConflict) {
                const conflictingExamName = (sessionConflict as any).Exam?.ExamName || 'another exam';
                console.warn(`[Import] Student ${normalizedRegNo} already has ${conflictingExamName} in the same session (${currentExam.ExamDate} ${currentExam.Session})`);
                // Note: We don't block the import, just log it as per requirement.
            }

            // ── STEP 3: UPSERT EXAM REGISTRATION ──
            const [registration, created] = await ExamRegistration.findOrCreate({
                where: {
                    ExamID: examId,
                    StudentID: student.StudentID
                },
                defaults: {
                    ExamID: examId,
                    StudentID: student.StudentID,
                    IsEligible: isEligible
                } as any,
                transaction
            });

            if (created) {
                registrationsCreated++;
            } else {
                // UPDATE if exists (Case 3)
                if ((registration as any).IsEligible !== isEligible) {
                    await (registration as any).update({ IsEligible: isEligible }, { transaction });
                    registrationsUpdated++;
                } else {
                    registrationsSkipped++;
                }
            }
        }

        return {
            total: eligibleCount + ineligibleCount,
            eligibleCount,
            ineligibleCount,
            createdUsers,
            updatedUsers,
            createdStudents,
            updatedStudents,
            registrationsCreated,
            registrationsUpdated,
            registrationsSkipped,
            errorCount: errors.length,
            errors
        };
    }

    static async bulkImportEligibility(req: Request, res: Response) {
        try {
            const { date } = req.body;
            const files = req.files as Express.Multer.File[];

            if (!date || !files || files.length === 0) {
                return res.status(400).json({ message: 'Missing date or files' });
            }

            const parsedDate = formatDateForDb(new Date(date));

            // Fetch ALL exams for the entire day, regardless of session
            const exams = await Exam.findAll({
                where: {
                    ExamDate: parsedDate
                },
                include: [{
                    model: Subject,
                    attributes: ['SubjectID', 'SubjectCode', 'SubjectName', 'DepartmentID'],
                    include: [{
                        model: Department,
                        attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName']
                    }]
                }]
            });

            const normalizeStr = (str: string) => {
                return (str || '')
                    .replace(/[—–]/g, '-')
                    .replace(/[^a-zA-Z0-9 -]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toUpperCase();
            };

            const result = {
                success: [] as any[],
                skipped: [] as any[],
                errors: [] as any[]
            };

            for (const file of files) {
                const originalName = file.originalname;
                let rawSubject = originalName.replace(/\.[^/.]+$/, ''); // remove extension
                rawSubject = rawSubject.replace(/^EligibleList[-_ ]?/i, ''); // remove prefix
                const fileSubject = normalizeStr(rawSubject);

                const exactMatches = exams.filter(exam => {
                    const examSubject = normalizeStr((exam as any).Subject?.SubjectName);
                    return fileSubject === examSubject;
                });

                let finalExam = null;

                if (exactMatches.length > 0) {
                    // If there's 1 or more exact matches, just pick the first one.
                    // This handles cases where the same subject has multiple rows (e.g., for different departments)
                    finalExam = exactMatches[0];
                } else {
                    // Fallback Matching
                    let partialMatches = exams.filter(exam => {
                        const examSubject = normalizeStr((exam as any).Subject?.SubjectName);
                        return fileSubject.includes(examSubject) || examSubject.includes(fileSubject);
                    }).sort((a, b) => {
                        const aLen = normalizeStr((a as any).Subject?.SubjectName).length;
                        const bLen = normalizeStr((b as any).Subject?.SubjectName).length;
                        return bLen - aLen;
                    });

                    if (partialMatches.length > 0) {
                        const maxLen = normalizeStr((partialMatches[0] as any).Subject?.SubjectName).length;
                        partialMatches = partialMatches.filter(exam => normalizeStr((exam as any).Subject?.SubjectName).length === maxLen);
                    }

                    if (partialMatches.length === 0) {
                        result.skipped.push({ file: originalName, reason: 'No matching exam scheduled for this date' });
                        continue;
                    } else if (partialMatches.length > 1) {
                        result.errors.push({ file: originalName, reason: 'Ambiguous: Multiple partial matches found' });
                        continue;
                    } else {
                        finalExam = partialMatches[0];
                    }
                }

                try {
                    const rows = parseEligibleWorkbook(file.buffer, originalName);
                    if (!rows.length) {
                        result.skipped.push({ file: originalName, reason: 'Empty file' });
                        continue;
                    }

                    // Execution
                    const transaction = await sequelize.transaction();
                    try {
                        const importResult = await ExamController._processEligibleStudentsRows(
                            (finalExam as any).ExamID,
                            rows,
                            transaction,
                            (finalExam as any).Subject?.DepartmentID
                        );
                        await transaction.commit();

                        result.success.push({
                            file: originalName,
                            exam: (finalExam as any).ExamName,
                            session: (finalExam as any).Session,
                            imported: importResult.total
                        });
                    } catch (err: any) {
                        await transaction.rollback();
                        result.errors.push({ file: originalName, reason: 'Database error during import: ' + err.message });
                    }
                } catch (err: any) {
                    result.errors.push({ file: originalName, reason: 'File parse error: ' + err.message });
                }
            }

            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ message: 'Failed to bulk import', error: error.message });
        }
    }

    // True Student Registration-Based Audit
    static async auditSeries(seriesId: number) {
        console.log(`Starting Audit for Series ID: ${seriesId}`);
        try {
            // 1. Fetch all exams in this series
            const exams = await Exam.findAll({
                where: { ExamSeriesID: seriesId },
                include: [{
                    model: Subject,
                    attributes: ['SubjectCode', 'SubjectName']
                }]
            });

            // 2. Clear previous audit status
            await Exam.update(
                { AuditStatus: 'Clean', ConflictDetails: null } as any,
                { where: { ExamSeriesID: seriesId } }
            );

            // 3. Find true student conflicts
            const updates: Promise<any>[] = [];
            const slots = new Map<string, any[]>();

            // Group by Date + Session
            exams.forEach(exam => {
                const key = `${exam.ExamDate}_${exam.Session}`;
                if (!slots.has(key)) slots.set(key, []);
                slots.get(key)?.push(exam);
            });

            let flaggedCount = 0;

            for (const [slot, slotExams] of slots.entries()) {
                if (slotExams.length <= 1) continue;

                // For this slot, get all registrations for these exams
                const examIds = slotExams.map(e => (e as any).ExamID);
                const regs = await ExamRegistration.findAll({
                    where: { ExamID: examIds },
                    attributes: ['StudentID', 'ExamID']
                });

                // Check which students have multiple registrations
                const studentExams = new Map<number, number[]>();
                regs.forEach(r => {
                    const sId = (r as any).StudentID;
                    const eId = (r as any).ExamID;
                    if (!studentExams.has(sId)) studentExams.set(sId, []);
                    studentExams.get(sId)?.push(eId);
                });

                const conflictingExamIds = new Set<number>();
                const conflictDetailsMap = new Map<number, Set<string>>(); // ExamID -> Set of conflicting SubjectCodes

                for (const [studentId, eIds] of studentExams.entries()) {
                    if (eIds.length > 1) {
                        // This student is in multiple exams!
                        eIds.forEach(id => conflictingExamIds.add(id));

                        // Build details
                        eIds.forEach(id => {
                            if (!conflictDetailsMap.has(id)) conflictDetailsMap.set(id, new Set());
                            const otherIds = eIds.filter(otherId => otherId !== id);
                            otherIds.forEach(otherId => {
                                const otherExam = slotExams.find(e => (e as any).ExamID === otherId);
                                if (otherExam) {
                                    conflictDetailsMap.get(id)?.add((otherExam as any).Subject?.SubjectCode || (otherExam as any).ExamName);
                                }
                            });
                        });
                    }
                }

                if (conflictingExamIds.size > 0) {
                    conflictingExamIds.forEach(id => {
                        const exam = slotExams.find(e => (e as any).ExamID === id);
                        if (exam) {
                            const details = Array.from(conflictDetailsMap.get(id) || []).join(', ');
                            updates.push(exam.update({
                                AuditStatus: 'Conflict',
                                ConflictDetails: `Student clash with: ${details}`
                            } as any));
                            flaggedCount++;
                        }
                    });
                }
            }

            await Promise.all(updates);
            console.log(`Audit Complete. ${flaggedCount} exams flagged with true student conflicts.`);

        } catch (error) {
            console.error("Audit Failed:", error);
        }
    }

    // Preview timetable without importing
    static async previewTimetable(req: Request, res: Response) {
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
                        ? "No timetable rows could be parsed from PDF"
                        : (isDocx || isDoc || isRtf)
                            ? "No timetable rows could be parsed from the Word/RTF file"
                            : "No rows found in uploaded file"
                });
            }

            // Get column headers from first row
            const headers = data.length > 0 ? Object.keys(data[0]) : [];

            // Return preview data
            res.status(200).json({
                success: true,
                message: "Timetable preview loaded",
                data: data.slice(0, 100), // Limit to first 100 rows for preview
                headers,
                totalRows: data.length,
                parseMode: isPdf
                    ? (pdfExtractResult?.usedOcr ? 'pdf-ocr' : 'pdf-text')
                    : isDocx
                        ? 'docx-text'
                        : isDoc
                            ? 'doc-text'
                            : isRtf
                                ? 'rtf-text'
                                : 'spreadsheet'
            });

        } catch (error: any) {
            console.error("Preview error:", error);
            res.status(500).json({ message: "Failed to preview timetable", error: error.message });
        }
    }

    // Get eligible students for an exam
    static async getEligibleStudents(req: Request, res: Response) {
        try {
            const examId = Number(req.params.id);
            if (!Number.isFinite(examId)) {
                return res.status(400).json({ message: 'Invalid exam id' });
            }

            const exam = await Exam.findByPk(examId);
            if (!exam) {
                return res.status(404).json({ message: 'Exam not found' });
            }

            // Fetch ALL registrations for this exam (eligible + ineligible)
            const rows = await sequelize.query(`
                SELECT 
                    s.StudentID,
                    s.RegisterNumber,
                    s.FullName,
                    s.Status,
                    u.Email,
                    er.IsEligible
                FROM Students s
                LEFT JOIN Users u ON s.UserID = u.UserID
                INNER JOIN ExamRegistrations er ON s.StudentID = er.StudentID
                WHERE er.ExamID = :examId
                ORDER BY s.FullName ASC
            `, {
                replacements: { examId },
                type: QueryTypes.SELECT
            });

            const allStudents = (rows as any[]).map((row: any) => ({
                StudentID: row.StudentID,
                RegisterNumber: row.RegisterNumber,
                FullName: row.FullName,
                Email: row.Email || 'N/A',
                Status: row.Status,
                IsEligible: row.IsEligible === 1 || row.IsEligible === true,
            }));

            const eligibleStudents = allStudents.filter(s => s.IsEligible);
            const ineligibleStudents = allStudents.filter(s => !s.IsEligible);

            // Compute batch-wise counts for eligible students
            const batchCounts: Record<string, number> = {};
            eligibleStudents.forEach(s => {
                // Extract batch prefix (e.g., SJ24CS001 -> SJ24CS, SJ24MCAAD001 -> SJ24MCAAD)
                // We take everything before the last 3 digits if they are numeric, 
                // or just some reasonable prefix logic.
                const reg = s.RegisterNumber || '';
                const match = reg.match(/^([A-Z0-9]+?)\d{3}$/i) || reg.match(/^([A-Z0-9]+)/i);
                const batch = match ? match[1].toLowerCase() : 'Unknown';
                batchCounts[batch] = (batchCounts[batch] || 0) + 1;
            });

            res.json({
                success: true,
                examId,
                totalStudents: allStudents.length,
                eligibleCount: eligibleStudents.length,
                ineligibleCount: ineligibleStudents.length,
                batchCounts,
                // Keep legacy `students` key pointing to eligible only for backward compat
                students: eligibleStudents,
                eligibleStudents,
                ineligibleStudents,
            });
        } catch (error: any) {
            console.error("Error fetching eligible students:", error);
            res.status(500).json({ message: 'Failed to fetch eligible students', error: error.message });
        }
    }
}
