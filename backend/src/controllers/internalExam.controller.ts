import { Request, Response } from 'express';
import { InternalExam, InternalExamSeries, InternalExamDepartment, Department, AcademicYear, InternalSubjectEligibility, Subject, ExamSchedule, InternalStudentSubject } from '../models/index.js';
import { autoMapStudentsForExamCore } from './internalStudent.controller.js';
import { SubjectEligibilityImportService } from '../services/internal/subjectEligibilityImport.service.js';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const OCR_CACHE_PATH = path.join(os.tmpdir(), 'seat-sync-tesseract-cache');

export class InternalExamController {

    static normalizeDepartmentCode(value: unknown): string {
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
    }

    static parseDepartmentCodes(raw: unknown): string[] {
        let text = String(raw ?? '').trim().toUpperCase();
        if (!text) return [];
        
        if (text.includes('ALL BRANCHES') || text === 'ALL' || text === 'ALL_BRANCHES') {
            return ['ALL_BRANCHES'];
        }

        text = text.replace(/\s*\(.*?\)/g, '');
        const tokens = text.split(/[\s,/;&|.\-_]+/);
        const results = new Set<string>();

        for (const token of tokens) {
            const norm = InternalExamController.normalizeDepartmentCode(token);
            if (norm && norm !== 'A' && norm !== 'B' && norm !== 'C' && norm !== 'D' && norm !== 'E') {
                results.add(norm);
            }
        }

        return Array.from(results);
    }

    /**
     * Resolves course code and subject name from raw timetable course string + optional explicit name,
     * with fallback to system database lookup (InternalSubjectEligibility, Subject, ExamSchedule).
     */
    static async resolveSubjectCodeAndName(courseRaw: any, explicitNameRaw?: any): Promise<{ subjectCode: string; subjectName: string }> {
        let rawStr = String(courseRaw || '').replace(/^["'“”`]+/, '').trim();
        rawStr = rawStr.replace(/^\d+[\s.-]+(?=[A-Z0-9])/i, '').trim();

        let subjectCode = '';
        let subjectName = '';

        let expName = String(explicitNameRaw || '').replace(/^["'“”`]+/, '').trim();

        // 1. Try regex pattern: Code followed by space/dash/colon/brackets and Subject Title
        // e.g. "24SJINMCA301 - COMPUTER ORGANIZATION", "24SJINMCA301 COMPUTER ORGANIZATION", "24SJINMCA301 (COMPUTER ORGANIZATION)"
        const codePattern = /^([0-9]{2}[A-Za-z]{2,8}[0-9]{3,4}[A-Za-z0-9]*|[A-Za-z]{2,6}[0-9]{3,4}[A-Za-z0-9]*)[\s:\-–—\(\)]+(.*)$/i;
        const codeMatch = rawStr.match(codePattern);

        if (codeMatch && codeMatch[1] && codeMatch[2] && codeMatch[2].trim()) {
            subjectCode = codeMatch[1].trim().toUpperCase();
            subjectName = codeMatch[2].replace(/[\(\)]/g, '').trim();
        } else {
            const hyphenSplit = rawStr.split(/[-–—:]\s*/);
            const firstPart = (hyphenSplit[0] || '').trim();
            if (hyphenSplit.length >= 2 && firstPart.length > 0) {
                subjectCode = firstPart.toUpperCase();
                subjectName = hyphenSplit.slice(1).join(' - ').trim();
            } else {
                const spaceSplit = rawStr.split(/\s+/);
                subjectCode = (spaceSplit[0] || rawStr).toUpperCase();
                if (spaceSplit.length > 1) {
                    subjectName = spaceSplit.slice(1).join(' ').trim();
                } else {
                    subjectName = rawStr;
                }
            }
        }

        if (expName && expName.toUpperCase() !== subjectCode.toUpperCase()) {
            subjectName = expName;
        }

        // 2. Database Lookup Fallback: If subjectName is empty or identical to subjectCode (case-insensitive)
        if (!subjectName || subjectName.toUpperCase() === subjectCode.toUpperCase()) {
            const normCode = SubjectEligibilityImportService.normalizeCourseCode(subjectCode);

            const matchElig = await InternalSubjectEligibility.findOne({
                where: { SubjectCode: { [Op.or]: [subjectCode, normCode] } },
                attributes: ['SubjectName']
            });
            if (matchElig && matchElig.SubjectName && matchElig.SubjectName.toUpperCase() !== subjectCode.toUpperCase()) {
                subjectName = matchElig.SubjectName.trim();
            } else {
                const matchSubj = await Subject.findOne({
                    where: { SubjectCode: { [Op.or]: [subjectCode, normCode] } },
                    attributes: ['SubjectName']
                });
                if (matchSubj && matchSubj.SubjectName && matchSubj.SubjectName.toUpperCase() !== subjectCode.toUpperCase()) {
                    subjectName = matchSubj.SubjectName.trim();
                } else {
                    const matchInt = await InternalExam.findOne({
                        where: { SubjectCode: { [Op.or]: [subjectCode, normCode] } },
                        attributes: ['SubjectName']
                    });
                    if (matchInt && matchInt.SubjectName && matchInt.SubjectName.toUpperCase() !== subjectCode.toUpperCase()) {
                        subjectName = matchInt.SubjectName.trim();
                    }
                }
            }
        }

        // Final cleanup: ensure subjectCode is UPPERCASE
        subjectCode = subjectCode.toUpperCase();
        if (!subjectName || subjectName.toUpperCase() === subjectCode) {
            subjectName = subjectCode;
        }

        return { subjectCode, subjectName };
    }

    static excelSerialToDate(serial: number): Date | null {
        if (!Number.isFinite(serial)) return null;
        const Math_floor = Math.floor(serial - 25569);
        const dateInfo = new Date(Math_floor * 86400 * 1000);
        return isNaN(dateInfo.getTime()) ? null : new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
    }

    static parseExamDateValue(raw: unknown): Date | null {
        if (raw instanceof Date && !isNaN(raw.getTime())) {
            return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
        }
        if (typeof raw === 'number') {
            return InternalExamController.excelSerialToDate(raw);
        }
        const text = String(raw ?? '').trim();
        if (!text) return null;

        const ddmmyyyyMatch = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
        if (ddmmyyyyMatch && ddmmyyyyMatch[1] && ddmmyyyyMatch[2] && ddmmyyyyMatch[3]) {
            const d = parseInt(ddmmyyyyMatch[1]);
            const m = parseInt(ddmmyyyyMatch[2]);
            let y = parseInt(ddmmyyyyMatch[3]);
            if (y < 100) y += 2000;
            const manualDate = new Date(y, m - 1, d);
            if (!isNaN(manualDate.getTime())) return manualDate;
        }

        const standardDate = new Date(text);
        if (!isNaN(standardDate.getTime())) {
            let y = standardDate.getFullYear();
            if (y === 2001 && !text.includes('2001')) y = new Date().getFullYear();
            return new Date(y, standardDate.getMonth(), standardDate.getDate());
        }
        return null;
    }

    static formatDateForDb(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    static extractSemester(text: string): string | null {
        if (!text) return null;
        const cleanUpper = text.toUpperCase().trim();

        // 1. Explicit S1..S8 check (must be standalone token or section header e.g. "S3 BTECH", "S5", "S-3")
        const sMatch = cleanUpper.match(/\bS[-_\s]*([1-8])\b/);
        if (sMatch && sMatch[1]) return `S${sMatch[1]}`;

        // 2. SEM 1..8 or SEMESTER 1..8 check
        const semMatch = cleanUpper.match(/\bSEM(?:ESTER)?[-_\s]*([1-8])\b/);
        if (semMatch && semMatch[1]) return `S${semMatch[1]}`;

        // 3. Word semester match (e.g. THIRD SEMESTER, FIFTH SEMESTER, 3RD SEMESTER)
        const wordMap: Record<string, string> = {
            FIRST: 'S1', '1ST': 'S1',
            SECOND: 'S2', '2ND': 'S2',
            THIRD: 'S3', '3RD': 'S3',
            FOURTH: 'S4', '4TH': 'S4',
            FIFTH: 'S5', '5TH': 'S5',
            SIXTH: 'S6', '6TH': 'S6',
            SEVENTH: 'S7', '7TH': 'S7',
            EIGHTH: 'S8', '8TH': 'S8'
        };

        for (const [key, val] of Object.entries(wordMap)) {
            if (cleanUpper.match(new RegExp(`\\b${key}\\s+(?:SEM|SEMESTER|YEAR|BTECH|B\\.TECH|MCA|DEGREE)\\b`))) {
                return val;
            }
        }

        // 4. Roman numeral semester match (e.g. III SEMESTER, SEMESTER III, V SEMESTER, SEMESTER V)
        const romanMap: Record<string, string> = {
            I: 'S1', II: 'S2', III: 'S3', IV: 'S4',
            V: 'S5', VI: 'S6', VII: 'S7', VIII: 'S8'
        };

        for (const [key, val] of Object.entries(romanMap)) {
            if (cleanUpper.match(new RegExp(`(?:\\b${key}\\s+(?:SEM|SEMESTER)|\\b(?:SEM|SEMESTER)\\s+${key})\\b`))) {
                return val;
            }
        }

        return null;
    }

    static extractProgramme(text: string): { code: string; label: string } | null {
        if (!text) return null;
        const upper = text.toUpperCase().trim();

        if (/\b(?:INT\.?(?:EGRATED)?\s*MCA|IMCA|INMCA)\b/.test(upper)) {
            return { code: 'INTEGRATED_MCA', label: 'Integrated MCA' };
        }
        if (/\b(?:MCA|M\.C\.A)\b/.test(upper)) {
            return { code: 'MCA', label: 'MCA' };
        }
        if (/\b(?:BTECH|B\.TECH|B\s+TECH|BACHELOR\s+OF\s+TECHNOLOGY)\b/.test(upper) || upper.includes('ENGINEERING')) {
            return { code: 'BTECH', label: 'B.Tech' };
        }
        if (/\b(?:MBA|M\.B\.A)\b/.test(upper)) {
            return { code: 'MBA', label: 'MBA' };
        }
        if (/\b(?:BHM|B\.H\.M)\b/.test(upper)) {
            return { code: 'BHM', label: 'BHM' };
        }
        return null;
    }

    static detectHeaderSection(text: string): { semester: string | null; programme: { code: string; label: string } | null } | null {
        if (!text) return null;
        const upper = text.toUpperCase().trim();

        const isHeaderContext = upper.includes('INTERNAL') || upper.includes('EXAM') || upper.includes('SCHEME') ||
                                upper.includes('SEMESTER') || upper.includes('TIMETABLE') || upper.includes('BTECH') ||
                                upper.includes('DEGREE') || upper.includes('MCA') || upper.includes('PROGRAMME') ||
                                upper.match(/\bS[1-8]\b/);

        if (!isHeaderContext) return null;

        const sem = InternalExamController.extractSemester(upper);
        const prog = InternalExamController.extractProgramme(upper);

        if (!sem && !prog) return null;
        return { semester: sem, programme: prog };
    }

    static calculateDuration(startTime: string, endTime: string): number {
        if (!startTime || !endTime) return 150; // Default 2.5 hours

        const parseTime = (timeStr: string) => {
            const match = timeStr.match(/(\d{1,2})(?::|\.)?(\d{2})?\s*(AM|PM)?/i);
            if (!match) return null;
            let hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const ampm = match[3]?.toUpperCase();

            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
        };

        const startMins = parseTime(startTime);
        const endMins = parseTime(endTime);

        if (startMins !== null && endMins !== null && endMins > startMins) {
            return endMins - startMins;
        }

        return 150;
    }

    static extractRowsFromSpreadsheet(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        if (workbook.SheetNames.length === 0) throw new Error('Invalid file: No sheets found');
        
        let allRows: any[] = [];

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;

            const sheetSemester = InternalExamController.extractSemester(sheetName);
            const sheetProgramme = InternalExamController.extractProgramme(sheetName);

            // Read sheet as 2D string array
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false }) as string[][];
            if (!rawData || rawData.length === 0) continue;

            let tableStartIndex = -1;
            let columnHeaders: string[] = [];

            // Detect primary header row
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i] || [];
                const rowStr = row.join(' ').toUpperCase();
                
                if (rowStr.includes('DAY') || rowStr.includes('DATE') || rowStr.includes('COURSE') || rowStr.includes('SUBJECT') || rowStr.includes('EXAM')) {
                    tableStartIndex = i;
                    columnHeaders = row.map(h => String(h).toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    break;
                }
            }

            if (tableStartIndex === -1 && rawData.length > 0) {
                tableStartIndex = 0;
                columnHeaders = (rawData[0] || []).map(h => String(h).toUpperCase().replace(/[^A-Z0-9]/g, ''));
            }

            let currentSemester: string | null = sheetSemester || null;
            let currentProgrammeCode = sheetProgramme?.code || 'BTECH';
            let currentProgrammeLabel = sheetProgramme?.label || 'B.Tech';

            let lastDate: any = null;
            let lastTime: any = null;
            let lastSlot: any = null;

            for (let i = tableStartIndex + 1; i < rawData.length; i++) {
                const rowArray = rawData[i] || [];
                if (!rowArray || rowArray.length === 0 || rowArray.join('').trim() === '') continue;

                const rowStr = rowArray.join(' ').toUpperCase();

                // Skip footers / signatures
                if (rowStr.includes('PRINCIPAL') || rowStr.includes('SIGNATURE') || rowStr.includes('CONTROLLER OF EXAMINATIONS')) continue;

                // Check if this row is a Section Heading line (e.g. "S3 B.Tech", "S5 B.Tech", "S3 MCA", "S3 Int. MCA")
                const section = InternalExamController.detectHeaderSection(rowStr);
                if (section) {
                    if (section.semester) currentSemester = section.semester;
                    if (section.programme) {
                        currentProgrammeCode = section.programme.code;
                        currentProgrammeLabel = section.programme.label;
                    }
                    // Reset inheritance context on section boundary
                    lastDate = null;
                    lastTime = null;
                    lastSlot = null;
                }

                const rowObj: Record<string, any> = {};
                for (let j = 0; j < columnHeaders.length; j++) {
                    const col = columnHeaders[j];
                    if (col) {
                        rowObj[col] = rowArray[j];
                    }
                }

                const getColVal = (keys: string[]) => {
                    for (const k of keys) {
                        if (rowObj[k] !== undefined && rowObj[k] !== null && String(rowObj[k]).trim() !== '') {
                            return String(rowObj[k]).trim();
                        }
                    }
                    return undefined;
                };

                const dateVal = getColVal(['DAYDATE', 'DATE', 'EXAMDATE', 'DAYANDDATE', 'DAY', 'DATEOFEXAM']);
                const timeVal = getColVal(['TIME', 'SESSION', 'EXAMTIME', 'TIMINGS', 'TIMING']);
                const slotVal = getColVal(['SLOT']);
                const branchVal = getColVal(['BRANCHES', 'BRANCH', 'DEPARTMENT', 'DEPARTMENTS', 'DEPTS', 'DEPT', 'PROGRAMME', 'PROGRAM', 'STREAM']);

                const courseVal = getColVal(['COURSECODE', 'SUBJECTCODE', 'COURSECODESUBJECTCODE', 'SUBCODE', 'PAPERCODE', 'CODE', 'COURSE', 'SUBJECT', 'DISCIPLINE']);
                const courseNameVal = getColVal(['EXAMINATIONNAME', 'EXAMNAME', 'EXAMINATION', 'SUBJECTNAME', 'COURSENAME', 'PAPERNAME', 'SUBJECTTITLE', 'TITLE', 'EXAMTITLE', 'NAME', 'TITLEOFPAPER', 'SUBTITLE', 'TITLEOFCOURSE']);

                if (dateVal) lastDate = dateVal;
                if (timeVal) lastTime = timeVal;
                if (slotVal) lastSlot = slotVal;

                if (!courseVal && !courseNameVal) continue; // Skip non-course rows

                // Check inline row content for explicit semester or programme override if present
                const rowSem = InternalExamController.extractSemester(rowStr) || currentSemester || 'S3';
                const rowProg = InternalExamController.extractProgramme(rowStr);
                const finalProgCode = rowProg?.code || currentProgrammeCode;
                const finalProgLabel = rowProg?.label || currentProgrammeLabel;

                allRows.push({
                    _inheritedDate: lastDate,
                    _inheritedTime: lastTime,
                    _inheritedSlot: lastSlot,
                    _semester: rowSem,
                    _programmeCode: finalProgCode,
                    _programmeLabel: finalProgLabel,
                    _sourceSheet: sheetName,
                    _sourceRow: i + 1,
                    Branch: branchVal,
                    Course: courseVal || courseNameVal,
                    CourseName: courseNameVal
                });
            }
        }

        return allRows;
    }

    static flattenRtfText(node: any): string {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(n => InternalExamController.flattenRtfText(n)).join('');
        if (typeof node === 'object') {
            if (typeof node.value === 'string') return node.value;
            if (Array.isArray(node.content)) return node.content.map((n: any) => InternalExamController.flattenRtfText(n)).join('');
        }
        return '';
    }

    static normalizeLines(text: string) {
        return text.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }

    static async extractRowsFromTextDocument(buffer: Buffer, fileType: 'docx' | 'doc' | 'rtf') {
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
                rtfParser.string(rtfString, (err: Error | null, parsed: any) => err ? reject(err) : resolve(parsed));
            });
            text = Array.isArray(doc?.content) ? doc.content.map((p: any) => InternalExamController.flattenRtfText(p).trim()).filter(Boolean).join('\n') : '';
        }
        return InternalExamController.extractRowsFromLines(InternalExamController.normalizeLines(text));
    }

    static isSemesterHeaderLine(line: string): string | null {
        const section = InternalExamController.detectHeaderSection(line);
        return section?.semester || null;
    }

    static extractRowsFromLines(lines: string[]) {
        const rows: any[] = [];
        let currentDate: string | null = null;
        let currentTime: string | null = null;
        let currentSlot: string | null = null;
        let currentSemester: string | null = null;
        let currentProgrammeCode = 'BTECH';
        let currentProgrammeLabel = 'B.Tech';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] || '';

            // Section header detection
            const section = InternalExamController.detectHeaderSection(line);
            if (section) {
                if (section.semester) currentSemester = section.semester;
                if (section.programme) {
                    currentProgrammeCode = section.programme.code;
                    currentProgrammeLabel = section.programme.label;
                }
                // Reset inheritance on new section
                currentDate = null;
                currentTime = null;
                currentSlot = null;
            }

            const dateMatch = line.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s*[A-Za-z]{3,9}\.?\s*\d{4})\b/);
            if (dateMatch) currentDate = dateMatch[0];

            const timeMatch = line.match(/\b\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\s*(?:-|–|to)\s*\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\b/i);
            if (timeMatch) currentTime = timeMatch[0];

            const slotMatch = line.match(/\b(?:Slot\s+)?([A-Z])\b/i);
            if (slotMatch && line.toLowerCase().includes('slot')) currentSlot = slotMatch[1] || null;

            // Course code matching (e.g. 24SJGAMAT301, 24SJPCCET501, 24SIMCA263, MAT201, CST302)
            const courseCodeMatch = line.match(/\b(2[0-9][A-Z0-9]{5,12}|[A-Z]{2,6}[0-9]{3,6}[A-Z0-9]*)\b/);
            
            if (courseCodeMatch) {
                const matchedCode = courseCodeMatch[1];
                if (matchedCode && !/^\d+$/.test(matchedCode) && !/^\d{1,2}[\/.-]\d{1,2}/.test(matchedCode)) {
                    const branchMatch = line.match(/\b(?:[A-Z]{2,4}\s*[,&/]\s*)+[A-Z]{2,4}\b|\bALL\s+BRANCHES\b|\bALL\b/i);
                    const branchStr = branchMatch ? branchMatch[0] : 'ALL_BRANCHES';

                    let cleanCourse = line
                        .replace(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/g, '')
                        .replace(/\b\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\b/gi, '')
                        .replace(/\b(?:FN|AN)\b/gi, '')
                        .replace(/\|/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    const lineSem = InternalExamController.extractSemester(line) || currentSemester || 'S3';
                    const lineProg = InternalExamController.extractProgramme(line);
                    const finalProgCode = lineProg?.code || currentProgrammeCode;
                    const finalProgLabel = lineProg?.label || currentProgrammeLabel;

                    rows.push({
                        _inheritedDate: currentDate,
                        _inheritedTime: currentTime,
                        _inheritedSlot: currentSlot,
                        _semester: lineSem,
                        _programmeCode: finalProgCode,
                        _programmeLabel: finalProgLabel,
                        _sourceRow: i + 1,
                        Course: cleanCourse,
                        Branch: branchStr
                    });
                }
            }
        }
        return rows;
    }

    static async extractRowsFromPdf(buffer: Buffer) {
        const parser = new PDFParse({ data: buffer });
        try {
            const textResult = await parser.getText();
            const textLines = InternalExamController.normalizeLines(textResult.text || '');
            let rows = InternalExamController.extractRowsFromLines(textLines);

            if (rows.length > 0) return { rows, usedOcr: false };

            const screenshots = await parser.getScreenshot({ scale: 3, imageBuffer: true, imageDataUrl: false });
            if (!screenshots.pages?.length) return { rows: [], usedOcr: true };

            const worker = await createWorker('eng', undefined, { cachePath: OCR_CACHE_PATH });
            try {
                const ocrLines: string[] = [];
                for (const page of screenshots.pages) {
                    if (!page.data || page.data.length === 0) continue;
                    const ocrResult = await worker.recognize(Buffer.from(page.data));
                    ocrLines.push(...InternalExamController.normalizeLines(ocrResult.data?.text || ''));
                }
                rows = InternalExamController.extractRowsFromLines(ocrLines);
            } finally {
                await worker.terminate();
            }
            return { rows, usedOcr: true };
        } finally {
            await parser.destroy();
        }
    }

    static async importTimetable(req: Request, res: Response) {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        try {
            const filename = (req.file.originalname || '').toLowerCase();
            const { seriesId } = req.body;

            if (!seriesId) {
                return res.status(400).json({ message: "Exam Series ID is required" });
            }

            const isPdf = req.file.mimetype === 'application/pdf' || filename.endsWith('.pdf');
            const isDocx = filename.endsWith('.docx');
            const isDoc = filename.endsWith('.doc');
            const isRtf = filename.endsWith('.rtf');

            let data: any[] = [];
            let parseMode = 'Standard';
            
            if (isPdf) {
                const pdfResult = await InternalExamController.extractRowsFromPdf(req.file.buffer);
                data = pdfResult.rows;
                parseMode = pdfResult.usedOcr ? 'OCR' : 'PDF Text';
            } else if (isDocx || isDoc || isRtf) {
                data = await InternalExamController.extractRowsFromTextDocument(req.file.buffer, isDocx ? 'docx' : isDoc ? 'doc' : 'rtf');
                parseMode = 'Document';
            } else {
                data = InternalExamController.extractRowsFromSpreadsheet(req.file.buffer);
                parseMode = 'Excel / CSV';
            }

            if (!Array.isArray(data) || data.length === 0) {
                return res.status(400).json({ message: "No valid rows found in uploaded file. Check the format." });
            }

            let successCount = 0;
            let updatedCount = 0;
            let errors: string[] = [];
            let parsedItems: any[] = [];

            const activeDepartments = await Department.findAll();
            const deptIdMap = new Map<string, number>();
            activeDepartments.forEach(d => deptIdMap.set(d.DepartmentCode, d.DepartmentID));
            const allDeptIds = activeDepartments.map(d => d.DepartmentID);

            for (const row of data) {
                try {
                    const dateRaw = row._inheritedDate;
                    const timeRaw = row._inheritedTime;
                    const slotRaw = row._inheritedSlot;
                    const semesterRaw = row._semester || 'S3';
                    const programmeCodeRaw = row._programmeCode || 'BTECH';
                    const programmeLabelRaw = row._programmeLabel || 'B.Tech';
                    const branchesRaw = row.Branch;
                    const courseRaw = row.Course;

                    if (!courseRaw || !dateRaw) continue;

                    const examDate = InternalExamController.parseExamDateValue(dateRaw);
                    if (!examDate) throw new Error(`Invalid Date format: ${dateRaw}`);
                    const formattedDate = InternalExamController.formatDateForDb(examDate);

                    let session = 'FN';
                    let startTime = '';
                    let endTime = '';

                    if (timeRaw) {
                        const timeStr = String(timeRaw).toLowerCase();
                        if (timeStr.includes('am')) session = 'FN';
                        if (timeStr.includes('pm')) session = 'AN';
                        
                        const timeMatch = String(timeRaw).match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi);
                        if (timeMatch && timeMatch.length >= 2) {
                            startTime = timeMatch[0] ? timeMatch[0].trim() : '';
                            endTime = timeMatch[1] ? timeMatch[1].trim() : '';
                        }
                    }

                    const duration = InternalExamController.calculateDuration(startTime, endTime);

                    const deptCodes = InternalExamController.parseDepartmentCodes(branchesRaw);
                    const targetDeptIds: number[] = [];

                    const courseStr = String(courseRaw).trim();
                    const courseUpper = courseStr.toUpperCase();
                    const slotUpper = String(slotRaw || '').toUpperCase();
                    const branchUpper = String(branchesRaw || '').toUpperCase();

                    let subjectType = 'CORE';
                    let scopeType = 'BRANCH_SCOPE';

                    if (courseUpper.includes('MINOR') || slotUpper.includes('MINOR') || branchUpper.includes('MINOR')) {
                        subjectType = 'MINOR';
                        scopeType = 'ELECTIVE_REGISTRATION_REQUIRED';
                    } else if (courseUpper.includes('HONOUR') || slotUpper.includes('HONOUR') || branchUpper.includes('HONOUR')) {
                        subjectType = 'HONOURS';
                        scopeType = 'ELECTIVE_REGISTRATION_REQUIRED';
                    } else if (courseUpper.includes('ELECTIVE') || slotUpper.includes('ELECTIVE') || branchUpper.includes('ELECTIVE')) {
                        subjectType = 'ELECTIVE';
                        scopeType = 'ELECTIVE_REGISTRATION_REQUIRED';
                    } else if (deptCodes.includes('ALL_BRANCHES')) {
                        scopeType = 'ALL_BRANCHES';
                    }

                    if (deptCodes.includes('ALL_BRANCHES')) {
                        targetDeptIds.push(...allDeptIds);
                    } else {
                        for (const code of deptCodes) {
                            if (deptIdMap.has(code)) {
                                targetDeptIds.push(deptIdMap.get(code)!);
                            }
                        }
                    }

                    const explicitNameRaw = row.CourseName || row.ExaminationName || row.SubjectName || row.ExamName || row.Title || row.SubjectTitle;
                    const { subjectCode, subjectName } = await InternalExamController.resolveSubjectCodeAndName(courseRaw, explicitNameRaw);

                    const branchScopeStr = deptCodes.join(',');

                    let resolvedProgCode = programmeCodeRaw;
                    let resolvedProgLabel = programmeLabelRaw;

                    const upperCode = (subjectCode || '').toUpperCase();
                    const upperName = (subjectName || '').toUpperCase();

                    if (
                        upperCode.includes('INMCA') || upperCode.includes('IMCA') || upperCode.includes('INT_MCA') ||
                        upperName.includes('INTEGRATED MCA') || upperName.includes('INT MCA') ||
                        deptCodes.some(d => d === 'INMCA' || d === 'IMCA' || d === 'INT_MCA' || d === 'INT')
                    ) {
                        resolvedProgCode = 'INTEGRATED_MCA';
                        resolvedProgLabel = 'Integrated MCA';
                    } else if (
                        upperCode.includes('MCA') ||
                        upperName.includes('MASTER OF COMPUTER APPLICATIONS') || upperName.includes('MCA') ||
                        deptCodes.some(d => d === 'MCA')
                    ) {
                        resolvedProgCode = 'MCA';
                        resolvedProgLabel = 'MCA';
                    } else if (
                        upperCode.includes('MTECH') || upperCode.includes('M.TECH') ||
                        upperName.includes('M.TECH') || upperName.includes('MTECH') ||
                        deptCodes.some(d => d === 'MTECH')
                    ) {
                        resolvedProgCode = 'MTECH';
                        resolvedProgLabel = 'M.Tech';
                    }

                    console.log(`[TimetableImport] Row #${row._sourceRow}: CourseCode="${subjectCode}", SubjectName="${subjectName}", Semester="${semesterRaw}", Programme="${resolvedProgLabel}", Branches="${branchScopeStr}"`);

                    parsedItems.push({
                        semester: semesterRaw,
                        programmeCode: resolvedProgCode,
                        programmeLabel: resolvedProgLabel,
                        date: formattedDate,
                        session: session,
                        slot: slotRaw || '-',
                        branch: branchScopeStr,
                        subjectCode: subjectCode,
                        subjectName: subjectName,
                        subjectType,
                        scopeType,
                        sourceSheet: row._sourceSheet,
                        sourceRow: row._sourceRow
                    });

                    if (req.body.previewOnly === 'true' || req.body.previewOnly === true) {
                        continue;
                    }

                    const [exam, created] = await InternalExam.findOrCreate({
                        where: {
                            InternalExamSeriesID: seriesId,
                            Semester: semesterRaw,
                            ExamDate: formattedDate as any,
                            Session: session,
                            SubjectCode: subjectCode
                        },
                        defaults: {
                            InternalExamSeriesID: seriesId,
                            Semester: semesterRaw,
                            ExamDate: formattedDate as any,
                            Session: session,
                            SubjectCode: subjectCode,
                            SubjectName: subjectName || subjectCode,
                            Slot: slotRaw ? String(slotRaw).trim() : null,
                            Duration: duration,
                            StartTime: startTime || null,
                            EndTime: endTime || null,
                            BranchScope: branchScopeStr,
                            ScopeType: scopeType,
                            SubjectType: subjectType
                        } as any
                    });

                    if (created) {
                        successCount++;
                    } else {
                        const updatePayload: any = {
                            Semester: semesterRaw,
                            Slot: slotRaw ? String(slotRaw).trim() : null,
                            Duration: duration,
                            StartTime: startTime || null,
                            EndTime: endTime || null,
                            BranchScope: branchScopeStr,
                            ScopeType: scopeType,
                            SubjectType: subjectType
                        };
                        // Only update SubjectName if a non-empty, distinct title is provided, or if existing name is equal to subjectCode
                        if (subjectName && (subjectName.toUpperCase() !== subjectCode.toUpperCase() || (exam.SubjectName || '').toUpperCase() === subjectCode.toUpperCase())) {
                            updatePayload.SubjectName = subjectName;
                        }
                        await exam.update(updatePayload);
                        updatedCount++;
                    }

                    for (const deptId of targetDeptIds) {
                        await InternalExamDepartment.findOrCreate({
                            where: {
                                InternalExamID: exam.InternalExamID,
                                DepartmentID: deptId
                            }
                        });
                    }
                } catch (err: any) {
                    console.error("Row Error:", err.message);
                    errors.push(`Row error: ${err.message}`);
                }
            }

            // Build hierarchical semester and programme distribution summary
            const semGroupMap = new Map<string, Map<string, { label: string; count: number }>>();
            for (const item of parsedItems) {
                const sem = String(item.semester || 'S3').toUpperCase().trim();
                const progCode = item.programmeCode || 'BTECH';
                const progLabel = item.programmeLabel || 'B.Tech';

                if (!semGroupMap.has(sem)) semGroupMap.set(sem, new Map());
                const progMap = semGroupMap.get(sem)!;

                if (!progMap.has(progCode)) progMap.set(progCode, { label: progLabel, count: 0 });
                progMap.get(progCode)!.count += 1;
            }

            const semestersSummary = Array.from(semGroupMap.entries()).map(([sem, progMap]) => ({
                semester: sem,
                examCount: Array.from(progMap.values()).reduce((sum, p) => sum + p.count, 0),
                programmes: Array.from(progMap.entries()).map(([pCode, pData]) => ({
                    programme: pCode,
                    programmeLabel: pData.label,
                    examCount: pData.count
                }))
            })).sort((a, b) => a.semester.localeCompare(b.semester));

            return res.json({
                success: true,
                message: req.body.previewOnly === 'true' || req.body.previewOnly === true 
                    ? `Timetable preview loaded (${parsedItems.length} subjects across ${semestersSummary.length} semester(s))`
                    : "Import processing complete",
                totalRows: data.length,
                totalExams: parsedItems.length,
                successCount,
                updatedCount,
                errorCount: errors.length,
                errors,
                parseMode,
                semesters: semestersSummary,
                preview: parsedItems
            });

        } catch (error: any) {
            console.error("Internal Exam Import Error:", error);
            res.status(500).json({ message: "Fatal error during import", error: error.message });
        }
    }

    static async repairAllInternalExams(): Promise<{ totalExams: number; repairedDepts: number; totalMappedStudents: number }> {
        try {
            const allDepts = await Department.findAll();
            const deptIdMap = new Map<string, number>();
            allDepts.forEach(d => {
                deptIdMap.set(d.DepartmentCode.toUpperCase(), d.DepartmentID);
            });
            const allDeptIds = allDepts.map(d => d.DepartmentID);

            const exams = await InternalExam.findAll({
                include: [{ model: InternalExamDepartment }]
            });

            let repairedDepts = 0;
            let totalMappedStudents = 0;

            for (const exam of exams) {
                const depts = (exam as any).InternalExamDepartments || [];
                let targetDeptIds: number[] = depts.map((d: any) => d.DepartmentID);

                if (targetDeptIds.length === 0) {
                    const deptCodes = InternalExamController.parseDepartmentCodes(exam.BranchScope || 'ALL_BRANCHES');
                    if (deptCodes.includes('ALL_BRANCHES') || deptCodes.includes('ALL') || deptCodes.length === 0) {
                        targetDeptIds = [...allDeptIds];
                    } else {
                        for (const code of deptCodes) {
                            if (deptIdMap.has(code)) {
                                targetDeptIds.push(deptIdMap.get(code)!);
                            }
                        }
                    }

                    if (targetDeptIds.length === 0) {
                        targetDeptIds = [...allDeptIds];
                    }

                    for (const deptId of targetDeptIds) {
                        const [_, created] = await InternalExamDepartment.findOrCreate({
                            where: {
                                InternalExamID: exam.InternalExamID,
                                DepartmentID: deptId
                            }
                        });
                        if (created) repairedDepts++;
                    }
                }
            }

            console.log(`[repairAllInternalExams] Done: ${exams.length} exams processed, ${repairedDepts} dept mappings created.`);
            return { totalExams: exams.length, repairedDepts, totalMappedStudents: 0 };
        } catch (error: any) {
            console.error('[repairAllInternalExams] Error:', error);
            throw error;
        }
    }
}
