import { Request, Response } from 'express';
import { InternalExam, InternalExamSeries, InternalExamDepartment, Department, AcademicYear } from '../models/index.js';
import { autoMapStudentsForExamCore } from './internalStudent.controller.js';
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
            INMCA: 'IMCA', ITCS: 'CS', ITCE: 'CE', ITEC: 'EC', ITEE: 'EE',
            EE: 'EE', EC: 'EC', CS: 'CS', CSE: 'CS', ECE: 'EC', EEE: 'EE',
            MECH: 'ME', CIVIL: 'CE', AD: 'AD', CA: 'CA', CC: 'CC', RA: 'RA',
            ER: 'ER', EEEWP: 'EEEWP', CSEWP: 'CSEWP', ECEWP: 'ECEWP', CEWP: 'CEWP', MEWP: 'MEWP'
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
        
        if (text.includes('ALL BRANCHES') || text === 'ALL') {
            return ['ALL_BRANCHES'];
        }

        text = text.replace(/\s*\(.*?\)/g, '');
        return [...new Set(
            text.split(/[,&/;|]+/)
                .map((s) => InternalExamController.normalizeDepartmentCode(s.trim()))
                .filter(Boolean)
        )];
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
        text = text.toUpperCase();
        
        let match = text.match(/\bS([1-8])\b/);
        if (match) return `S${match[1]}`;

        match = text.match(/\bSEM(?:ESTER)?\s*([1-8])\b/);
        if (match) return `S${match[1]}`;

        const romanMap: Record<string, string> = {
            FIRST: 'S1', SECOND: 'S2', THIRD: 'S3', FOURTH: 'S4',
            FIFTH: 'S5', SIXTH: 'S6', SEVENTH: 'S7', EIGHTH: 'S8',
            I: 'S1', II: 'S2', III: 'S3', IV: 'S4',
            V: 'S5', VI: 'S6', VII: 'S7', VIII: 'S8'
        };

        for (const [key, val] of Object.entries(romanMap)) {
            if (text.match(new RegExp(`\\b${key}\\b`))) return val;
        }

        return null;
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
            
            // Read as a 2D array to process headers and detect table start
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "", blankrows: false }) as string[][];
            
            let headerSemester: string | null = null;
            let tableStartIndex = -1;
            let columnHeaders: string[] = [];

            // Stage 1: Detect Metadata and Table Start
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i] || [];
                const rowStr = row.join(' ').toUpperCase();
                
                // Try to extract semester from header rows
                if (!headerSemester) {
                    const sem = InternalExamController.extractSemester(rowStr);
                    if (sem) headerSemester = sem;
                }

                // Detect table start
                if (rowStr.includes('DAY') && rowStr.includes('DATE') && rowStr.includes('COURSE')) {
                    tableStartIndex = i;
                    columnHeaders = row.map(h => String(h).toUpperCase().replace(/\s+/g, ''));
                    break;
                }
            }

            const finalSemester = sheetSemester || headerSemester || null;

            // Fallback if no clean header found
            if (tableStartIndex === -1 && rawData.length > 0) {
                tableStartIndex = 0;
                columnHeaders = (rawData[0] || []).map(h => String(h).toUpperCase().replace(/\s+/g, ''));
            }

            // Stage 2: Process Data Rows with Inheritance
            let lastDate: any = null;
            let lastTime: any = null;
            let lastSlot: any = null;

            for (let i = tableStartIndex + 1; i < rawData.length; i++) {
                const rowArray = rawData[i] || [];
                if (!rowArray || rowArray.length === 0 || rowArray.join('').trim() === '') continue;

                // Ignore signature/footer rows
                const rowStr = rowArray.join(' ').toUpperCase();
                if (rowStr.includes('PRINCIPAL') || rowStr.includes('SIGNATURE')) continue;

                const rowObj: Record<string, any> = {};
                for (let j = 0; j < columnHeaders.length; j++) {
                    const col = columnHeaders[j];
                    if (col) {
                        rowObj[col] = rowArray[j];
                    }
                }

                const dateVal = rowObj['DAY&DATE'] || rowObj['DATE'] || rowObj['EXAMDATE'];
                const timeVal = rowObj['TIME'] || rowObj['SESSION'];
                const slotVal = rowObj['SLOT'];
                const branchVal = rowObj['BRANCH'] || rowObj['BRANCHES'] || rowObj['DEPARTMENT'];
                const courseVal = rowObj['COURSE'] || rowObj['COURSENAME'] || rowObj['COURSECODE'];

                if (dateVal) lastDate = dateVal;
                if (timeVal) lastTime = timeVal;
                if (slotVal) lastSlot = slotVal;

                if (!courseVal) continue; // Skip empty rows

                allRows.push({
                    _inheritedDate: lastDate,
                    _inheritedTime: lastTime,
                    _inheritedSlot: lastSlot,
                    _semester: finalSemester,
                    Branch: branchVal,
                    Course: courseVal
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

    static extractRowsFromLines(lines: string[]) {
        const rows: any[] = [];
        let currentDate: string | null = null;
        let currentTime: string | null = null;
        let currentSlot: string | null = null;
        let currentSemester: string | null = null;

        for (const line of lines) {
            const semMatch = InternalExamController.extractSemester(line);
            if (semMatch) currentSemester = semMatch;

            const dateMatch = line.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s*[A-Za-z]{3,9}\.?\s*\d{4})\b/);
            if (dateMatch) currentDate = dateMatch[0];

            const timeMatch = line.match(/\b\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\s*(?:-|–|to)\s*\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)\b/i);
            if (timeMatch) currentTime = timeMatch[0];

            const slotMatch = line.match(/\b(?:Slot\s+)?([A-Z])\b/i);
            if (slotMatch) currentSlot = slotMatch[1] || null;

            const courseMatch = line.match(/\b(?:2\d[A-Z]{2,}[A-Z0-9]*\d{2,}|[A-Z]{2,}[0-9]{2,}[A-Z0-9-]*)\b/);
            if (courseMatch) {
                rows.push({
                    _inheritedDate: currentDate,
                    _inheritedTime: currentTime,
                    _inheritedSlot: currentSlot,
                    _semester: currentSemester,
                    Course: line,
                    Branch: 'ALL_BRANCHES'
                });
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
                    const semesterRaw = row._semester || null;
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

                    if (deptCodes.includes('ALL_BRANCHES')) {
                        targetDeptIds.push(...allDeptIds);
                    } else {
                        for (const code of deptCodes) {
                            if (deptIdMap.has(code)) {
                                targetDeptIds.push(deptIdMap.get(code)!);
                            }
                        }
                    }

                    const courseStr = String(courseRaw).trim();
                    const codeMatch = courseStr.match(/^([A-Z0-9]+)\s+(.*)$/i);
                    let subjectCode = courseStr;
                    let subjectName = courseStr;

                    if (codeMatch && codeMatch[1] && codeMatch[2]) {
                        subjectCode = codeMatch[1].trim();
                        subjectName = codeMatch[2].trim();
                    } else {
                        subjectCode = courseStr.split(' ')[0] || courseStr;
                    }

                    // For the preview payload
                    parsedItems.push({
                        semester: semesterRaw,
                        date: formattedDate,
                        session: session,
                        slot: slotRaw || '-',
                        branch: deptCodes.join(', '),
                        subjectCode: subjectCode,
                        subjectName: subjectName
                    });

                    if (req.body.previewOnly === 'true' || req.body.previewOnly === true) {
                        continue;
                    }

                    const [exam, created] = await InternalExam.findOrCreate({
                        where: {
                            InternalExamSeriesID: seriesId,
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
                            SubjectName: subjectName,
                            Slot: slotRaw ? String(slotRaw).trim() : null,
                            Duration: duration,
                            StartTime: startTime || null,
                            EndTime: endTime || null
                        } as any
                    });

                    if (created) {
                        successCount++;
                    } else {
                        await exam.update({
                            Semester: semesterRaw,
                            SubjectName: subjectName,
                            Slot: slotRaw ? String(slotRaw).trim() : null,
                            Duration: duration,
                            StartTime: startTime || null,
                            EndTime: endTime || null
                        } as any);
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

                    // Auto register eligible students matching exam semester and departments
                    try {
                        await autoMapStudentsForExamCore(exam.InternalExamID);
                    } catch (amErr) {
                        console.warn(`[AutoMap Warning] Exam ${exam.InternalExamID} auto-map skipped:`, amErr);
                    }

                } catch (err: any) {
                    console.error("Row Error:", err.message);
                    errors.push(`Row error: ${err.message}`);
                }
            }

            return res.json({
                success: true,
                message: "Import processing complete",
                successCount,
                updatedCount,
                errorCount: errors.length,
                errors,
                parseMode,
                preview: parsedItems
            });

        } catch (error: any) {
            console.error("Internal Exam Import Error:", error);
            res.status(500).json({ message: "Fatal error during import", error: error.message });
        }
    }
}
