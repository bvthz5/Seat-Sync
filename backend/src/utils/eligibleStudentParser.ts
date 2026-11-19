import * as XLSX from 'xlsx';

export interface ParsedEligibleStudentRow {
    rowNumber: number;
    fullName: string;
    registerNumber: string;
    isEligible: boolean;
    email?: string;
    program?: string;
    programCode?: string;
    semester?: string;
    department?: string;
    batch?: string;
    rawRow: Record<string, any>;
}

export interface ParsedEligibleWorkbookResult {
    rows: ParsedEligibleStudentRow[];
    skippedInvalidRows: Array<{ row: number; reason: string }>;
    detectedHeaders: string[];
    totalDataRows: number;
}

/**
 * Clean invisible Unicode characters (BOM, zero-width spaces, soft hyphens, NBSP)
 * without stripping meaningful characters from names or register numbers.
 */
export const cleanCellText = (value: unknown): string =>
    String(value ?? '')
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
        .replace(/\u00A0/g, ' ')
        .trim();

/**
 * Normalize a column header for flexible comparison:
 * - strips invisible Unicode / UTF-8 BOM
 * - lowercases
 * - replaces punctuation/symbols with single spaces
 * - trims AFTER replacing (fixes trailing-dot headers like "Reg. No.")
 */
export const normalizeEligibleHeader = (value: unknown): string =>
    cleanCellText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

export const compactEligibleHeader = (value: unknown): string =>
    normalizeEligibleHeader(value).replace(/\s+/g, '');

const SERIAL_COMPACT_HEADERS = new Set([
    'slno', 'sno', 'sino', 'slino', 'serialno', 'serialnumber',
    'srno', 'sr', 'sl', 'no', 'index', 'rowno', 'rownumber', 'item'
]);

const REG_TIER1_COMPACT = new Set([
    'registernumber', 'registerno', 'registerid', 'registrationnumber', 'registrationno',
    'regno', 'regnumber', 'regnum', 'regid', 'regcode', 'reg', 'register', 'registration',
    'studentregno', 'studentregnumber', 'studentregisterno', 'studentregisternumber',
    'studentregistrationno', 'studentregistrationnumber',
    'universityregno', 'universityregnumber', 'universityregisterno',
    'universityregisternumber', 'universityregistrationno', 'universityregistrationnumber',
    'univregno', 'univregnumber', 'univregisterno', 'univregisternumber',
    'ktuid', 'kturegno', 'kturegisterno', 'kturegisternumber', 'kturegistrationno',
    'examregno', 'examregisterno', 'examregisternumber',
    'hallticketno', 'hallticketnumber', 'hallticket', 'admitcardno',
    'candidateregno', 'candidateregisterno', 'candidateregisternumber',
    'candidateregistrationno', 'candidateregistrationnumber', 'candregno',
    'usn', 'urn', 'prn', 'uid',
    'enrollmentno', 'enrollmentnumber', 'enrolmentno', 'enrolmentnumber', 'enrollno'
]);

const REG_TIER2_COMPACT = new Set([
    'admissionno', 'admissionnumber', 'admno', 'admnumber',
    'studentid', 'studentidno', 'studentcode', 'studentno', 'studentnumber',
    'idno', 'idnumber', 'candidateno', 'candidateid'
]);

const REG_TIER3_COMPACT = new Set([
    'rollno', 'rollnumber', 'roll', 'classrollno', 'classroll', 'examrollno', 'examroll'
]);

const NAME_EXCLUDED_WORDS = new Set([
    'course', 'subject', 'paper', 'dept', 'department', 'branch',
    'program', 'programme', 'degree', 'stream', 'exam', 'series',
    'father', 'mother', 'guardian', 'parent', 'college', 'school',
    'institute', 'institution', 'university', 'block', 'room', 'hall',
    'batch', 'file', 'sheet', 'faculty', 'teacher', 'staff', 'invigilator', 'advisor'
]);

const NAME_TIER1_COMPACT = new Set([
    'studentname', 'fullname', 'nameofthestudent', 'nameofstudent',
    'candidatename', 'nameofcandidate', 'nameofthecandidate',
    'studentfullname', 'learnername', 'applicantname', 'name'
]);

const NAME_TIER2_COMPACT = new Set([
    'student', 'candidate', 'learner', 'applicant'
]);

const ELIGIBILITY_COMPACT = new Set([
    'iseligible', 'eligible', 'eligibility', 'eligibilitystatus',
    'examstatus', 'exameligibility', 'attendanceeligible', 'attendancestatus',
    'status', 'remarks', 'remark', 'barred', 'detained', 'debarred', 'condonation', 'feestatus'
]);

// Subset of eligibility headers that are unambiguous COLUMN HEADERS (never data values like "Eligible"/"Detained")
const UNAMBIGUOUS_ELIGIBILITY_HEADERS = new Set([
    'iseligible', 'eligibility', 'eligibilitystatus',
    'examstatus', 'exameligibility', 'attendanceeligible', 'attendancestatus',
    'status', 'remarks', 'remark', 'feestatus'
]);

const INVERTED_ELIGIBILITY_COMPACT = new Set(['barred', 'detained', 'debarred']);

const EMAIL_COMPACT = new Set([
    'email', 'emailid', 'emailaddress', 'mail', 'mailid', 'studentemail', 'officialemail', 'collegeemail'
]);

const PROGRAM_COMPACT = new Set([
    'program', 'programname', 'programme', 'programmename', 'degree', 'stream'
]);

const PROGRAM_CODE_COMPACT = new Set([
    'programcode', 'programmecode', 'degreecode'
]);

const SEMESTER_COMPACT = new Set([
    'semester', 'sem', 'semesterno', 'semesternumber', 'semno', 'term'
]);

const DEPARTMENT_COMPACT = new Set([
    'department', 'dept', 'branch', 'departmentcode', 'deptcode',
    'departmentname', 'deptname', 'branchcode', 'branchname'
]);

const BATCH_COMPACT = new Set([
    'batch', 'batchyear', 'year', 'academicyear', 'joiningyear', 'admissionyear', 'class'
]);

const INELIGIBLE_EXACT = new Set([
    'no', 'n', 'not eligible', 'noteligible', '0', 'false', 'ineligible',
    'barred', 'detained', 'debarred', 'disqualified', 'withheld', 'suspended',
    'dropped', 'cancelled', 'canceled', 'fail', 'failed', 'not permitted',
    'rejected', 'hold', 'on hold', 'condonation pending', 'shortage'
]);

const ELIGIBLE_EXACT = new Set([
    'yes', 'y', '1', 'true', 'eligible', 'active', 'ok', 'pass',
    'passed', 'permitted', 'approved', 'regular', 'supplementary', 'supply', 'cleared'
]);

const NON_NAME_WORDS = new Set([
    ...INELIGIBLE_EXACT,
    ...ELIGIBLE_EXACT,
    'fn', 'an', 'male', 'female', 'm', 'f', 'other', 'na', 'n/a', 'nil', 'none', 'null', '-'
]);

const NOISE_ROW_REGEX =
    /^(?:total(?:\s+(?:no\.?\s*of\s*)?(?:students?|candidates?|count|eligible|ineligible))?|grand\s+total|summary|prepared\s+by|verified\s+by|approved\s+by|signature|hod|principal|controller\s+of\s+examinations|note|page\s+\d+|printed\s+on|generated\s+on|date|sl\.?\s*no\.?)\s*[:\-–—.]*$/i;

const BATCH_BANNER_REGEX = /^(batch|class|course|subject|semester|branch|department|exam|programme|program)\s*[:\-–—]/i;

const getRegHeaderPriority = (header: unknown): number => {
    const norm = normalizeEligibleHeader(header);
    const compact = norm.replace(/\s+/g, '');
    if (!compact || SERIAL_COMPACT_HEADERS.has(compact)) return 0;

    if (REG_TIER1_COMPACT.has(compact)) return 1;
    if (REG_TIER2_COMPACT.has(compact)) return 2;
    if (REG_TIER3_COMPACT.has(compact)) return 3;

    // Exclude unrelated numeric/code columns
    if (
        compact.includes('phone') || compact.includes('mobile') || compact.includes('contact') ||
        compact.includes('email') || compact.includes('mail') ||
        compact.includes('course') || compact.includes('subject') ||
        compact.includes('room') || compact.includes('seat') || (compact.includes('hall') && !compact.includes('ticket')) ||
        compact.includes('dept') || compact.includes('department') ||
        compact.includes('program') || compact.includes('sem') || compact.includes('date')
    ) {
        return 0;
    }

    // Only match header-like phrases (short labels without digits — avoids matching data values like "KTU-23-001")
    if (/\d/.test(compact) || norm.length > 45) return 0;

    if (/\b(reg(?:ister|istration)?|univ(?:ersity)?\s*reg|ktu|hall\s*ticket|enroll?ment)\b/.test(norm)) {
        return 1;
    }
    if (/\b(adm(?:ission)?|student\s*id|id\s*no)\b/.test(norm)) {
        return 2;
    }
    if (/\broll\b/.test(norm)) {
        return 3;
    }
    return 0;
};

const getNameHeaderPriority = (header: unknown): number => {
    const norm = normalizeEligibleHeader(header);
    const compact = norm.replace(/\s+/g, '');
    if (!compact || SERIAL_COMPACT_HEADERS.has(compact)) return 0;
    if (/\d/.test(compact) || norm.length > 45) return 0;

    const words = norm.split(' ').filter(Boolean);
    if (words.some((w) => NAME_EXCLUDED_WORDS.has(w))) return 0;

    if (NAME_TIER1_COMPACT.has(compact)) return 1;
    if (NAME_TIER2_COMPACT.has(compact)) return 2;

    if (words.includes('name') && !words.includes('user') && !words.includes('login')) {
        return 1;
    }
    return 0;
};

const isKnownAuxiliaryHeader = (header: unknown): boolean => {
    const compact = compactEligibleHeader(header);
    if (!compact) return false;
    return (
        SERIAL_COMPACT_HEADERS.has(compact) ||
        UNAMBIGUOUS_ELIGIBILITY_HEADERS.has(compact) ||
        EMAIL_COMPACT.has(compact) ||
        PROGRAM_COMPACT.has(compact) ||
        PROGRAM_CODE_COMPACT.has(compact) ||
        SEMESTER_COMPACT.has(compact) ||
        DEPARTMENT_COMPACT.has(compact) ||
        BATCH_COMPACT.has(compact) ||
        compact === 'firstname' ||
        compact === 'lastname' ||
        compact === 'middlename' ||
        compact === 'surname' ||
        compact === 'division' ||
        compact === 'div' ||
        compact === 'section' ||
        compact === 'sec' ||
        compact === 'gender' ||
        compact === 'phone' ||
        compact === 'mobile'
    );
};

/**
 * Strip optional outer footnote annotations (e.g. "LSJC23CS218*", "SJC23CS001(LE)")
 * ONLY for pattern-classification checks; the raw register number is preserved when storing.
 */
const stripRegAnnotationsForCheck = (value: string): string =>
    cleanCellText(value)
        .replace(/\s*\([^)]*\)\s*$/g, '')
        .replace(/[*†‡#]+$/g, '')
        .replace(/\s+/g, '');

/**
 * Checks whether a value looks like a student Register Number
 * (e.g. SJC24CS001, LSJC23CS218, TVE22CS010, AD2024001, B23CS001, L23CS01,
 *  24CS001, 2024/CS/012, SJC-24-CS-001, SJC.24.CS.001, LSJC23CS218*, 24001001)
 */
const looksLikeRegisterNumber = (value: string): boolean => {
    const cleaned = stripRegAnnotationsForCheck(value);
    if (!cleaned || cleaned.length < 4 || cleaned.length > 35) return false;
    if (cleaned.includes('@')) return false; // email
    // Purely letters with no digits -> not a register number
    if (!/\d/.test(cleaned)) return false;
    // Pure small serial integer (1..999) -> serial number, not register number
    if (/^\d{1,3}$/.test(cleaned)) return false;
    // Dates like 2026-11-23 or 23/11/2026 -> not register number
    if (/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/.test(cleaned)) return false;
    // Typical college/university reg number: alphanumeric with optional hyphen/slash/dot/underscore
    return /^[A-Za-z0-9][A-Za-z0-9\-/._]{3,34}$/.test(cleaned);
};

/**
 * Broad alphanumeric reg-number check used for:
 * - preventing data rows from ever being misclassified as header rows
 * - swapped-column detection & combined-cell splitting
 * Accepts ANY prefix length (SJC, LSJC, L, B, TVE, AD, KTU, etc.) and any separator (- / . _).
 */
const looksLikeStrictAlphanumericRegNo = (value: string): boolean => {
    const cleaned = stripRegAnnotationsForCheck(value);
    if (cleaned.length < 4 || cleaned.length > 35) return false;
    if (cleaned.includes('@')) return false;
    if (/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}$/.test(cleaned)) return false;
    const compact = cleaned.replace(/[-/._]/g, '');
    if (compact.length < 4 || compact.length > 30) return false;
    if (!/[A-Za-z]/.test(compact) || !/\d/.test(compact)) return false;
    // Any alphanumeric ID with letters+digits (1+ letters + 2+ digits, or 2+ digits + letters + digits)
    return (
        /^[A-Za-z]{1,10}\d{2,}[A-Za-z0-9]*$/.test(compact) ||
        /^\d{2,4}[A-Za-z]{1,10}\d{1,}[A-Za-z0-9]*$/.test(compact)
    );
};

/**
 * Checks whether a value looks like a person's name
 */
const looksLikePersonName = (value: string, allowSingleChar = false): boolean => {
    const trimmed = cleanCellText(value);
    const minLen = allowSingleChar ? 1 : 2;
    if (!trimmed || trimmed.length < minLen || trimmed.length > 100) return false;
    if (trimmed.includes('@') || /\d/.test(trimmed)) return false;
    if (NON_NAME_WORDS.has(trimmed.toLowerCase())) return false;
    if (NOISE_ROW_REGEX.test(trimmed) || BATCH_BANNER_REGEX.test(trimmed)) return false;
    return /^\p{L}[\p{L}\s.'`\-(),/]*$/u.test(trimmed);
};

const parseEligibilityFlag = (rawValue: unknown, headerName?: string): boolean => {
    const raw = cleanCellText(rawValue).toLowerCase();
    if (!raw) return true; // Empty defaults to eligible

    const compactHeader = compactEligibleHeader(headerName);
    const isInvertedCol = INVERTED_ELIGIBILITY_COMPACT.has(compactHeader);

    if (isInvertedCol) {
        if (ELIGIBLE_EXACT.has(raw) || raw === 'yes' || raw === '1' || raw === 'true') {
            return false; // Barred=Yes / Detained=Yes -> NOT eligible
        }
        return true;
    }

    if (INELIGIBLE_EXACT.has(raw)) return false;
    if (
        raw.includes('not eligible') ||
        raw.includes('ineligible') ||
        raw.includes('detained') ||
        raw.includes('debarred') ||
        raw.includes('barred') ||
        raw.includes('disqualified') ||
        raw.includes('shortage') ||
        raw.includes('withheld')
    ) {
        return false;
    }

    return true;
};

// Non-greedy regno token for combined single-cell extraction (never eats "-NAME" across separators!)
const COMBINED_REG_TOKEN =
    '(?:[A-Za-z]{1,10}(?:[-/.]?\\d{2,})(?:[-/.]?[A-Za-z]{1,8})?(?:[-/.]?\\d{1,})[A-Za-z0-9]*|[A-Za-z]{1,10}\\d{2,}[A-Za-z0-9]*|\\d{2,4}[-/.]?[A-Za-z]{1,10}[-/.]?\\d{1,}[A-Za-z0-9]*)';

const COMBINED_PREFIX_PAREN_RE = new RegExp(`^[(\\[]\\s*(${COMBINED_REG_TOKEN})\\s*[)\\]]\\s*[-–—:|,/\\s]*\\s*(\\p{L}[\\p{L}\\s.'\`\\-,/]*)$`, 'u');
const COMBINED_PREFIX_RE = new RegExp(`^(${COMBINED_REG_TOKEN})\\s*(?:[-–—:|,/\\n]|\\s+)\\s*(\\p{L}[\\p{L}\\s.'\`\\-,/]*)$`, 'u');
const COMBINED_SUFFIX_PAREN_RE = new RegExp(`^(\\p{L}[\\p{L}\\s.'\`\\-,/]*?)\\s*[(\\[]\\s*(${COMBINED_REG_TOKEN})\\s*[)\\]](?:\\s*[-–—:|,/].*)?$`, 'u');
const COMBINED_SUFFIX_SEP_RE = new RegExp(`^(\\p{L}[\\p{L}\\s.'\`\\-,/]*?)\\s*(?:[-–—:|,/\\n]|\\s+)\\s*(${COMBINED_REG_TOKEN})$`, 'u');

const extractCombinedCell = (cellText: string): { registerNumber: string; fullName: string } | null => {
    const trimmed = cleanCellText(cellText);
    if (!trimmed) return null;

    // Pattern 0: "(SJC24CS001) JOHN DOE" or "[LSJC23CS218] SARANG S"
    const p0 = trimmed.match(COMBINED_PREFIX_PAREN_RE);
    if (p0 && p0[1] && p0[2]) {
        const reg = p0[1].trim();
        const name = p0[2].trim();
        if (looksLikeStrictAlphanumericRegNo(reg) && looksLikePersonName(name, true)) {
            return { registerNumber: reg, fullName: name };
        }
    }

    // Pattern 1: "SJC24CS001 - JOHN DOE", "LSJC23CS218-SARANG S", "SJC24CS001\nJOHN DOE", "SJC24CS001 JOHN DOE"
    const p1 = trimmed.match(COMBINED_PREFIX_RE);
    if (p1 && p1[1] && p1[2]) {
        const reg = p1[1].trim();
        const name = p1[2].trim();
        if (looksLikeStrictAlphanumericRegNo(reg) && looksLikePersonName(name, true)) {
            return { registerNumber: reg, fullName: name };
        }
    }

    // Pattern 2: "JOHN DOE (SJC24CS001)", "SARANG S [LSJC23CS218]", "JOHN DOE (SJC24CS001) - Regular"
    const p2 = trimmed.match(COMBINED_SUFFIX_PAREN_RE);
    if (p2 && p2[1] && p2[2]) {
        const name = p2[1].trim();
        const reg = p2[2].trim();
        if (looksLikeStrictAlphanumericRegNo(reg) && looksLikePersonName(name, true)) {
            return { registerNumber: reg, fullName: name };
        }
    }

    // Pattern 3: "JOHN DOE - SJC24CS001" or "JOHN DOE SJC24CS001"
    const p3 = trimmed.match(COMBINED_SUFFIX_SEP_RE);
    if (p3 && p3[1] && p3[2]) {
        const name = p3[1].trim();
        const reg = p3[2].trim();
        if (looksLikeStrictAlphanumericRegNo(reg) && looksLikePersonName(name, true)) {
            return { registerNumber: reg, fullName: name };
        }
    }

    return null;
};

interface HeaderColumnMap {
    regCols: Array<{ idx: number; priority: number; header: string }>;
    nameCols: Array<{ idx: number; priority: number; header: string }>;
    serialIndices: Set<number>;
    firstNameIdx: number;
    middleNameIdx: number;
    lastNameIdx: number;
    eligCol: { idx: number; header: string } | null;
    emailIdx: number;
    programIdx: number;
    programCodeIdx: number;
    semesterIdx: number;
    departmentIdx: number;
    batchIdx: number;
    headers: string[];
}

const analyzeHeaderRow = (
    cells: any[],
    strictRepeatMode = false
): { isHeader: boolean; map: HeaderColumnMap } => {
    const headers = cells.map((c) => cleanCellText(c));
    const map: HeaderColumnMap = {
        regCols: [],
        nameCols: [],
        serialIndices: new Set<number>(),
        firstNameIdx: -1,
        middleNameIdx: -1,
        lastNameIdx: -1,
        eligCol: null,
        emailIdx: -1,
        programIdx: -1,
        programCodeIdx: -1,
        semesterIdx: -1,
        departmentIdx: -1,
        batchIdx: -1,
        headers
    };

    let auxCount = 0;
    let regLikeDataCount = 0;
    let exactHeaderRegCount = 0;
    let exactHeaderNameCount = 0;

    for (let idx = 0; idx < headers.length; idx++) {
        const h = headers[idx] || '';
        if (!h) continue;

        // If ANY cell looks like a student register number (any format with digits) or email, this is a DATA row, NOT a header!
        if (
            looksLikeStrictAlphanumericRegNo(h) ||
            looksLikeRegisterNumber(h) ||
            (h.includes('@') && h.includes('.'))
        ) {
            regLikeDataCount++;
            continue;
        }

        const compact = compactEligibleHeader(h);
        if (SERIAL_COMPACT_HEADERS.has(compact)) {
            map.serialIndices.add(idx);
            auxCount++;
            continue;
        }

        const regPri = getRegHeaderPriority(h);
        if (regPri > 0) {
            map.regCols.push({ idx, priority: regPri, header: h });
            if (REG_TIER1_COMPACT.has(compact) || REG_TIER2_COMPACT.has(compact) || REG_TIER3_COMPACT.has(compact)) {
                exactHeaderRegCount++;
            }
            continue;
        }

        if (compact === 'firstname' || compact === 'fname') {
            map.firstNameIdx = idx;
            exactHeaderNameCount++;
            continue;
        }
        if (compact === 'middlename' || compact === 'mname') {
            map.middleNameIdx = idx;
            continue;
        }
        if (compact === 'lastname' || compact === 'lname' || compact === 'surname') {
            map.lastNameIdx = idx;
            exactHeaderNameCount++;
            continue;
        }

        const namePri = getNameHeaderPriority(h);
        if (namePri > 0) {
            map.nameCols.push({ idx, priority: namePri, header: h });
            if (NAME_TIER1_COMPACT.has(compact) || NAME_TIER2_COMPACT.has(compact)) {
                exactHeaderNameCount++;
            }
            continue;
        }

        if (!map.eligCol && ELIGIBILITY_COMPACT.has(compact)) {
            map.eligCol = { idx, header: h };
            // Only count unambiguous header labels (NOT data values like "Eligible"/"Detained") toward auxCount!
            if (UNAMBIGUOUS_ELIGIBILITY_HEADERS.has(compact)) {
                auxCount++;
            }
            continue;
        }
        if (map.emailIdx === -1 && EMAIL_COMPACT.has(compact)) {
            map.emailIdx = idx;
            auxCount++;
            continue;
        }
        if (map.programCodeIdx === -1 && PROGRAM_CODE_COMPACT.has(compact)) {
            map.programCodeIdx = idx;
            auxCount++;
            continue;
        }
        if (map.programIdx === -1 && PROGRAM_COMPACT.has(compact)) {
            map.programIdx = idx;
            auxCount++;
            continue;
        }
        if (map.semesterIdx === -1 && SEMESTER_COMPACT.has(compact)) {
            map.semesterIdx = idx;
            auxCount++;
            continue;
        }
        if (map.departmentIdx === -1 && DEPARTMENT_COMPACT.has(compact)) {
            map.departmentIdx = idx;
            auxCount++;
            continue;
        }
        if (map.batchIdx === -1 && BATCH_COMPACT.has(compact)) {
            map.batchIdx = idx;
            auxCount++;
            continue;
        }
        if (isKnownAuxiliaryHeader(h)) {
            auxCount++;
        }
    }

    map.regCols.sort((a, b) => a.priority - b.priority);
    map.nameCols.sort((a, b) => a.priority - b.priority);

    const hasName = map.nameCols.length > 0 || map.firstNameIdx !== -1;
    const hasReg = map.regCols.length > 0;

    if (regLikeDataCount > 0) {
        return { isHeader: false, map };
    }

    // Once a header map is already active, require BOTH exact reg & exact name header keywords to treat a later row as a repeated section header
    if (strictRepeatMode) {
        const isRepeatedHeader = exactHeaderRegCount > 0 && exactHeaderNameCount > 0;
        return { isHeader: isRepeatedHeader, map };
    }

    const isHeader = (hasName && hasReg) || ((hasName || hasReg) && auxCount >= 1);
    return { isHeader, map };
};

const isNoiseOrEmptyRow = (cells: any[], map?: HeaderColumnMap): boolean => {
    const nonEmpty = cells
        .map((c) => cleanCellText(c))
        .filter(Boolean);

    if (nonEmpty.length === 0) return true;

    // If any cell looks like a register number (ANY format), NEVER treat this row as noise!
    if (nonEmpty.some((v) => looksLikeStrictAlphanumericRegNo(v) || looksLikeRegisterNumber(v))) {
        return false;
    }

    // Single-cell row: allow combined "REGNO - NAME", or if a mapped RegNo/Name column is populated, let extractRowUsingMap inspect/report it rather than silently dropping
    if (nonEmpty.length === 1) {
        const only = nonEmpty[0] || '';
        if (extractCombinedCell(only)) return false;
        if (NOISE_ROW_REGEX.test(only) || BATCH_BANNER_REGEX.test(only)) return true;
        // Single-cell title/banner line (e.g. "ST. JOSEPHS COLLEGE...") -> skip cleanly
        return true;
    }

    // Footer/summary rows like ["Total Students:", "65"] or ["Prepared By", "..."]
    const first = nonEmpty[0] || '';
    if (NOISE_ROW_REGEX.test(first) || BATCH_BANNER_REGEX.test(first)) {
        // Double-check if mapped regCol has a non-numeric value? No reg-like cell existed above, so safe to skip footer
        if (map && map.regCols.some((c) => cleanCellText(cells[c.idx]) !== '' && !/^\d{1,3}$/.test(cleanCellText(cells[c.idx])))) {
            return false;
        }
        return true;
    }

    return false;
};

const extractRowUsingMap = (
    cells: any[],
    rowNumber: number,
    map: HeaderColumnMap
): { parsed?: ParsedEligibleStudentRow; errorReason?: string; skip?: boolean } => {
    if (isNoiseOrEmptyRow(cells, map)) {
        return { skip: true };
    }

    // Build rawRow dictionary for downstream helpers (Program/Semester resolution, etc.)
    const rawRow: Record<string, any> = {};
    for (let i = 0; i < map.headers.length; i++) {
        const key = map.headers[i] || `Column_${i + 1}`;
        rawRow[key] = cells[i] ?? '';
    }

    // 1. Extract Register Number by priority tier (Tier 1 University/RegNo -> Tier 2 AdmNo -> Tier 3 RollNo)
    // Accept ANY non-empty string in a mapped register-number column (SJC, LSJC, TVE, numeric, etc.)!
    let registerNumber = '';
    for (const col of map.regCols) {
        const v = cleanCellText(cells[col.idx]);
        if (v) {
            registerNumber = v;
            break;
        }
    }

    // 2. Extract Full Name by priority tier (or First + Middle + Last Name)
    let fullName = '';
    for (const col of map.nameCols) {
        const v = cleanCellText(cells[col.idx]);
        if (v) {
            fullName = v;
            break;
        }
    }
    if (!fullName && map.firstNameIdx !== -1) {
        const parts = [
            cells[map.firstNameIdx],
            map.middleNameIdx !== -1 ? cells[map.middleNameIdx] : '',
            map.lastNameIdx !== -1 ? cells[map.lastNameIdx] : ''
        ]
            .map((p) => cleanCellText(p))
            .filter(Boolean);
        fullName = parts.join(' ');
    }

    // 3. Handle combined single-cell format ("SJC24CS001 - JOHN DOE", "JOHN DOE (LSJC23CS218)") if one field is missing
    if (!fullName && registerNumber) {
        const split = extractCombinedCell(registerNumber);
        if (split) {
            registerNumber = split.registerNumber;
            fullName = split.fullName;
        }
    } else if (!registerNumber && fullName) {
        const split = extractCombinedCell(fullName);
        if (split) {
            registerNumber = split.registerNumber;
            fullName = split.fullName;
        }
    }

    // 4. Fallback scan across remaining cells in the row if one of regNo or name is still missing
    // (handles shifted/merged cells or unexpected column positions!)
    if (!registerNumber || !fullName) {
        const usedIndices = new Set<number>([
            ...Array.from(map.serialIndices),
            map.emailIdx,
            map.programIdx,
            map.programCodeIdx,
            map.semesterIdx,
            map.departmentIdx,
            map.batchIdx,
            map.eligCol ? map.eligCol.idx : -1
        ]);

        // First check if any remaining cell has a combined "REGNO - NAME"
        for (let i = 0; i < cells.length; i++) {
            if (usedIndices.has(i)) continue;
            const text = cleanCellText(cells[i]);
            if (!text) continue;

            if (!registerNumber && !fullName) {
                const split = extractCombinedCell(text);
                if (split) {
                    registerNumber = split.registerNumber;
                    fullName = split.fullName;
                    break;
                }
            }

            if (
                !registerNumber &&
                (looksLikeStrictAlphanumericRegNo(text) || looksLikeRegisterNumber(text)) &&
                text !== fullName
            ) {
                registerNumber = text;
                continue;
            }
            if (!fullName && looksLikePersonName(text) && text !== registerNumber) {
                fullName = text;
            }
        }
    }

    // 5. Auto-fix accidentally swapped Name <-> Register Number columns
    if (
        fullName &&
        registerNumber &&
        (looksLikeStrictAlphanumericRegNo(fullName) || looksLikeRegisterNumber(fullName)) &&
        looksLikePersonName(registerNumber)
    ) {
        const tmp = fullName;
        fullName = registerNumber;
        registerNumber = tmp;
    }

    // Skip repeated header text ONLY if BOTH values are exact known header keywords (never real student data!)
    const fullNameCompact = compactEligibleHeader(fullName);
    const regCompact = compactEligibleHeader(registerNumber);
    if (
        (NAME_TIER1_COMPACT.has(fullNameCompact) || NAME_TIER2_COMPACT.has(fullNameCompact)) &&
        (REG_TIER1_COMPACT.has(regCompact) || REG_TIER2_COMPACT.has(regCompact) || REG_TIER3_COMPACT.has(regCompact))
    ) {
        return { skip: true };
    }

    if (!fullName || !registerNumber) {
        return {
            errorReason: !fullName && !registerNumber
                ? 'Missing required Name and Register Number'
                : !fullName
                    ? `Missing required Name (Reg No: ${registerNumber})`
                    : `Missing required Register Number (Name: ${fullName})`
        };
    }

    // Extract optional fields
    const isEligible = map.eligCol
        ? parseEligibilityFlag(cells[map.eligCol.idx], map.eligCol.header)
        : true;

    const email = map.emailIdx !== -1 ? cleanCellText(cells[map.emailIdx]) : undefined;
    const program = map.programIdx !== -1 ? cleanCellText(cells[map.programIdx]) : undefined;
    const programCode = map.programCodeIdx !== -1 ? cleanCellText(cells[map.programCodeIdx]) : undefined;
    const semester = map.semesterIdx !== -1 ? cleanCellText(cells[map.semesterIdx]) : undefined;
    const department = map.departmentIdx !== -1 ? cleanCellText(cells[map.departmentIdx]) : undefined;
    const batch = map.batchIdx !== -1 ? cleanCellText(cells[map.batchIdx]) : undefined;

    return {
        parsed: {
            rowNumber,
            fullName: fullName.replace(/\s+/g, ' ').trim(),
            registerNumber: registerNumber.trim(),
            isEligible,
            ...(email ? { email } : {}),
            ...(program ? { program } : {}),
            ...(programCode ? { programCode } : {}),
            ...(semester ? { semester } : {}),
            ...(department ? { department } : {}),
            ...(batch ? { batch } : {}),
            rawRow
        }
    };
};

const HEURISTIC_EXCLUDED_HEADER_WORDS = new Set([
    'room', 'rooms', 'block', 'building', 'floor', 'capacity', 'seat', 'seats', 'bench',
    'subject', 'course', 'paper', 'date', 'time', 'session', 'duration', 'exam', 'series',
    'marks', 'mark', 'score', 'grade', 'credits', 'credit', 'fee', 'fees', 'amount', 'paid',
    'phone', 'mobile', 'contact', 'address', 'gender', 'sex', 'dob', 'age', 'blood',
    'department', 'dept', 'branch', 'program', 'programme', 'degree', 'stream',
    'semester', 'sem', 'term', 'batch', 'year', 'class', 'division', 'div', 'section', 'sec',
    'sl', 'sr', 'sno', 'slno', 'srno', 'serial', 'index', 'count', 'total', 'status', 'remarks', 'remark'
]);

const isHeuristicExcludedHeader = (header: unknown): boolean => {
    const norm = normalizeEligibleHeader(header);
    if (!norm) return false;
    const compact = norm.replace(/\s+/g, '');
    if (SERIAL_COMPACT_HEADERS.has(compact)) return true;
    if (compact.includes('hall') && !compact.includes('ticket')) return true;
    const words = norm.split(' ').filter(Boolean);
    return words.some((w) => HEURISTIC_EXCLUDED_HEADER_WORDS.has(w));
};

/**
 * Fallback column-inference parser when a sheet has NO recognized headers
 * (e.g., headerless CSV/Excel or arbitrary custom column names in any order).
 */
const parseWithHeuristicInference = (
    rawGrid: Array<{ rowNumber: number; cells: any[] }>
): ParsedEligibleWorkbookResult => {
    const maxCols = rawGrid.reduce((max, r) => Math.max(max, r.cells.length), 0);
    if (maxCols === 0) {
        return { rows: [], skippedInvalidRows: [], detectedHeaders: [], totalDataRows: 0 };
    }

    const firstRowCells = rawGrid[0]?.cells || [];
    const excludedCols = new Set<number>();
    for (let c = 0; c < maxCols; c++) {
        // Only treat Row 1 cell as an excluded domain header if it has NO digits (real headers never contain reg numbers)
        const cellText = cleanCellText(firstRowCells[c]);
        if (cellText && !/\d/.test(cellText) && isHeuristicExcludedHeader(cellText)) {
            excludedCols.add(c);
        }
    }

    const regScores = new Array<number>(maxCols).fill(0);
    const strictRegScores = new Array<number>(maxCols).fill(0);
    const nameScores = new Array<number>(maxCols).fill(0);
    const emailScores = new Array<number>(maxCols).fill(0);
    const eligScores = new Array<number>(maxCols).fill(0);

    for (const { cells } of rawGrid) {
        if (isNoiseOrEmptyRow(cells)) continue;
        for (let c = 0; c < maxCols; c++) {
            const val = cleanCellText(cells[c]);
            if (!val) continue;
            if (val.includes('@') && val.includes('.')) {
                emailScores[c] = (emailScores[c] || 0) + 1;
            } else if (!excludedCols.has(c) && looksLikeStrictAlphanumericRegNo(val)) {
                strictRegScores[c] = (strictRegScores[c] || 0) + 1;
                regScores[c] = (regScores[c] || 0) + 1;
            } else if (!excludedCols.has(c) && looksLikeRegisterNumber(val)) {
                regScores[c] = (regScores[c] || 0) + 1;
            } else if (INELIGIBLE_EXACT.has(val.toLowerCase()) || ELIGIBLE_EXACT.has(val.toLowerCase())) {
                eligScores[c] = (eligScores[c] || 0) + 1;
            } else if (!excludedCols.has(c) && looksLikePersonName(val)) {
                nameScores[c] = (nameScores[c] || 0) + 1;
            }
        }
    }

    // Pick best Register Number column (prefer strict alphanumeric regnos first)
    let bestRegCol = -1;
    let bestRegScore = 0;
    for (let c = 0; c < maxCols; c++) {
        const score = (strictRegScores[c] || 0) * 3 + (regScores[c] || 0);
        if (score > bestRegScore) {
            bestRegScore = score;
            bestRegCol = c;
        }
    }

    // Pick best Name column (distinct from bestRegCol)
    let bestNameCol = -1;
    let bestNameScore = 0;
    for (let c = 0; c < maxCols; c++) {
        if (c === bestRegCol) continue;
        const score = nameScores[c] || 0;
        if (score > bestNameScore) {
            bestNameScore = score;
            bestNameCol = c;
        }
    }

    // Optional Email & Eligibility columns
    let bestEmailCol = -1;
    let bestEmailScore = 0;
    let bestEligCol = -1;
    let bestEligScore = 0;
    for (let c = 0; c < maxCols; c++) {
        if (c === bestRegCol || c === bestNameCol) continue;
        if ((emailScores[c] || 0) > bestEmailScore) {
            bestEmailScore = emailScores[c] || 0;
            bestEmailCol = c;
        }
        if ((eligScores[c] || 0) > bestEligScore) {
            bestEligScore = eligScores[c] || 0;
            bestEligCol = c;
        }
    }

    const firstRowHeaders = rawGrid[0]
        ? rawGrid[0].cells.map((c) => cleanCellText(c)).filter(Boolean)
        : [];

    if (bestRegCol === -1 || bestNameCol === -1 || bestRegScore === 0 || bestNameScore === 0) {
        // Still try combined single-cell extraction row by row
        const combinedRows: ParsedEligibleStudentRow[] = [];
        for (const { rowNumber, cells } of rawGrid) {
            for (const cell of cells) {
                const split = extractCombinedCell(String(cell ?? ''));
                if (split) {
                    combinedRows.push({
                        rowNumber,
                        fullName: split.fullName,
                        registerNumber: split.registerNumber,
                        isEligible: true,
                        rawRow: {}
                    });
                    break;
                }
            }
        }
        return {
            rows: combinedRows,
            skippedInvalidRows: [],
            detectedHeaders: firstRowHeaders,
            totalDataRows: combinedRows.length
        };
    }

    const inferredMap: HeaderColumnMap = {
        regCols: [{ idx: bestRegCol, priority: 1, header: `Column_${bestRegCol + 1}` }],
        nameCols: [{ idx: bestNameCol, priority: 1, header: `Column_${bestNameCol + 1}` }],
        serialIndices: new Set<number>(),
        firstNameIdx: -1,
        middleNameIdx: -1,
        lastNameIdx: -1,
        eligCol: bestEligCol !== -1 && bestEligScore >= 1 ? { idx: bestEligCol, header: 'Eligibility' } : null,
        emailIdx: bestEmailCol !== -1 && bestEmailScore >= 1 ? bestEmailCol : -1,
        programIdx: -1,
        programCodeIdx: -1,
        semesterIdx: -1,
        departmentIdx: -1,
        batchIdx: -1,
        headers: Array.from({ length: maxCols }, (_, i) => `Column_${i + 1}`)
    };

    const rows: ParsedEligibleStudentRow[] = [];
    const skippedInvalidRows: Array<{ row: number; reason: string }> = [];

    for (const { rowNumber, cells } of rawGrid) {
        // Only skip Row 1 as an unrecognized custom header if the reg column cell contains ZERO digits
        // (e.g. "ColA" / "CustomCode") — NEVER skip Row 1 if it contains any digit-bearing ID!
        const regCell = cleanCellText(cells[bestRegCol]);
        if (rowNumber === rawGrid[0]?.rowNumber && regCell && !/\d/.test(regCell)) {
            continue;
        }
        const extracted = extractRowUsingMap(cells, rowNumber, inferredMap);
        if (extracted.skip) continue;
        if (extracted.parsed) {
            rows.push(extracted.parsed);
        } else if (extracted.errorReason) {
            skippedInvalidRows.push({ row: rowNumber, reason: extracted.errorReason });
        }
    }

    return {
        rows,
        skippedInvalidRows,
        detectedHeaders: firstRowHeaders,
        totalDataRows: rows.length + skippedInvalidRows.length
    };
};

/**
 * Recalculate worksheet !ref from actual cell addresses so third-party Excel exporters
 * with stale/truncated dimension metadata NEVER cause the first or last row to be dropped!
 */
const expandSheetRef = (sheet: XLSX.WorkSheet): void => {
    let minR = Infinity;
    let minC = Infinity;
    let maxR = -1;
    let maxC = -1;

    for (const key of Object.keys(sheet)) {
        if (key.startsWith('!')) continue;
        const cell = sheet[key];
        if (!cell || (cell.v === undefined && cell.w === undefined)) continue;
        try {
            const addr = XLSX.utils.decode_cell(key);
            if (addr.r < minR) minR = addr.r;
            if (addr.c < minC) minC = addr.c;
            if (addr.r > maxR) maxR = addr.r;
            if (addr.c > maxC) maxC = addr.c;
        } catch {
            // ignore non-cell keys
        }
    }

    if (maxR >= 0 && maxC >= 0) {
        const existing = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
        const finalRange = {
            s: {
                r: existing ? Math.min(existing.s.r, minR) : minR,
                c: existing ? Math.min(existing.s.c, minC) : minC
            },
            e: {
                r: existing ? Math.max(existing.e.r, maxR) : maxR,
                c: existing ? Math.max(existing.e.c, maxC) : maxC
            }
        };
        sheet['!ref'] = XLSX.utils.encode_range(finalRange);
    }
};

const parseSheetGrid = (sheet: XLSX.WorkSheet): ParsedEligibleWorkbookResult => {
    expandSheetRef(sheet);
    const raw2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[][];
    const indexedRows: Array<{ rowNumber: number; cells: any[] }> = [];

    for (let i = 0; i < raw2D.length; i++) {
        const cells = raw2D[i];
        if (!Array.isArray(cells)) continue;
        const hasAnyContent = cells.some((c) => cleanCellText(c) !== '');
        if (!hasAnyContent) continue;
        indexedRows.push({ rowNumber: i + 1, cells });
    }

    if (indexedRows.length === 0) {
        return { rows: [], skippedInvalidRows: [], detectedHeaders: [], totalDataRows: 0 };
    }

    const rows: ParsedEligibleStudentRow[] = [];
    const skippedInvalidRows: Array<{ row: number; reason: string }> = [];
    let activeMap: HeaderColumnMap | null = null;
    let firstDetectedHeaders: string[] = [];
    let firstHeaderSignature = '';

    for (const { rowNumber, cells } of indexedRows) {
        if (!activeMap) {
            const headerCheck = analyzeHeaderRow(cells, false);
            if (headerCheck.isHeader) {
                activeMap = headerCheck.map;
                firstDetectedHeaders = headerCheck.map.headers.filter(Boolean);
                firstHeaderSignature = headerCheck.map.headers.map(compactEligibleHeader).join('|');
                continue;
            }
            continue; // Skip banner/title/college header lines before the first header row
        }

        // Once activeMap is found, ONLY treat a later row as a repeated section header if:
        // - it matches the exact first header row signature, OR
        // - it passes strict repeated-header detection (zero reg-like cells AND both exact name & exact reg headers)
        const currentSig = cells.map(compactEligibleHeader).join('|');
        if (firstHeaderSignature && currentSig === firstHeaderSignature) {
            continue;
        }
        const repeatCheck = analyzeHeaderRow(cells, true);
        if (repeatCheck.isHeader) {
            activeMap = repeatCheck.map;
            continue;
        }

        const extracted = extractRowUsingMap(cells, rowNumber, activeMap);
        if (extracted.skip) continue;

        if (extracted.parsed) {
            rows.push(extracted.parsed);
        } else if (extracted.errorReason) {
            skippedInvalidRows.push({ row: rowNumber, reason: extracted.errorReason });
        }
    }

    if (rows.length > 0) {
        return {
            rows,
            skippedInvalidRows,
            detectedHeaders: firstDetectedHeaders,
            totalDataRows: rows.length + skippedInvalidRows.length
        };
    }

    // Fallback: No recognized headers produced rows -> infer columns heuristically (headerless / arbitrary column names)
    const heuristic = parseWithHeuristicInference(indexedRows);
    if (heuristic.rows.length > 0) {
        return heuristic;
    }

    // Return whatever errors/headers we saw for clear diagnostics
    const fallbackHeaders = firstDetectedHeaders.length > 0
        ? firstDetectedHeaders
        : (indexedRows[0]?.cells.map((c) => cleanCellText(c)).filter(Boolean) || []);

    return {
        rows: [],
        skippedInvalidRows: skippedInvalidRows.length > 0 ? skippedInvalidRows : heuristic.skippedInvalidRows,
        detectedHeaders: fallbackHeaders,
        totalDataRows: skippedInvalidRows.length
    };
};

/**
 * Parse an uploaded Excel (.xlsx / .xls) or CSV eligible-students file
 * supporting arbitrary column order, flexible header aliases, trailing punctuation,
 * ANY register number format (SJC, LSJC, TVE, AD2024, numeric, hyphenated, etc.),
 * banner/title rows, multi-section tables, multi-sheet workbooks, and headerless sheets.
 */
export const parseEligibleStudentsWorkbook = (
    buffer: Buffer,
    filename: string
): ParsedEligibleWorkbookResult => {
    if (!buffer || buffer.length === 0) {
        throw new Error('Uploaded file is empty');
    }

    const lowerName = String(filename || '').toLowerCase();
    let workbook: XLSX.WorkBook;

    try {
        if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')) {
            const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
            const sampleLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
            const semicolonCount = sampleLines.reduce((acc, l) => acc + (l.match(/;/g)?.length || 0), 0);
            const commaCount = sampleLines.reduce((acc, l) => acc + (l.match(/,/g)?.length || 0), 0);
            const tabCount = sampleLines.reduce((acc, l) => acc + (l.match(/\t/g)?.length || 0), 0);

            const fs = tabCount > commaCount && tabCount > semicolonCount
                ? '\t'
                : semicolonCount > commaCount
                    ? ';'
                    : ',';
            workbook = XLSX.read(text, { type: 'string', raw: false, FS: fs });
        } else {
            workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
        }
    } catch (err: any) {
        throw new Error(`Could not read spreadsheet file (${err?.message || 'corrupted or unsupported format'})`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Invalid file: No sheets found');
    }

    const IGNORED_SHEET_NAME = /^(instructions?|readme|help|sample|example|template\s*guide)$/i;
    const primarySheets = workbook.SheetNames.filter((n) => !IGNORED_SHEET_NAME.test(n.trim()));
    const fallbackSheets = workbook.SheetNames.filter((n) => IGNORED_SHEET_NAME.test(n.trim()));

    const allRows: ParsedEligibleStudentRow[] = [];
    const allSkipped: Array<{ row: number; reason: string }> = [];
    let firstHeaders: string[] = [];
    let bestEmptyResult: ParsedEligibleWorkbookResult | null = null;

    // Collect from ALL primary (non-ignored) sheets so multi-sheet student files (e.g. Regular + Lateral) NEVER drop Sheet 2!
    const multiPrimary = primarySheets.length > 1;
    for (const sheetName of primarySheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const res = parseSheetGrid(sheet);
        if (res.rows.length > 0) {
            allRows.push(...res.rows);
            if (firstHeaders.length === 0) firstHeaders = res.detectedHeaders;
            if (res.skippedInvalidRows.length > 0) {
                allSkipped.push(
                    ...res.skippedInvalidRows.map((e) => ({
                        row: e.row,
                        reason: multiPrimary ? `[${sheetName}] ${e.reason}` : e.reason
                    }))
                );
            }
        } else if (!bestEmptyResult || res.detectedHeaders.length > bestEmptyResult.detectedHeaders.length) {
            bestEmptyResult = res;
        }
    }

    if (allRows.length > 0) {
        return {
            rows: allRows,
            skippedInvalidRows: allSkipped,
            detectedHeaders: firstHeaders,
            totalDataRows: allRows.length + allSkipped.length
        };
    }

    // Only check fallback/sample sheets if none of the primary sheets yielded any rows
    for (const sheetName of fallbackSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const res = parseSheetGrid(sheet);
        if (res.rows.length > 0) {
            return res;
        }
        if (!bestEmptyResult || res.detectedHeaders.length > bestEmptyResult.detectedHeaders.length) {
            bestEmptyResult = res;
        }
    }

    return bestEmptyResult || { rows: [], skippedInvalidRows: [], detectedHeaders: [], totalDataRows: 0 };
};
