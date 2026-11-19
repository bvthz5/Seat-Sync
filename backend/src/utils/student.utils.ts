/**
 * Generates a standardized universal default password for all students.
 * Formula: Fixed institutional password
 * Example: SJCET@123
 */
export const generateDefaultPassword = (_fullName: string, _registerNumber: string): string => {
    // Institutional default password configurable via .env
    return process.env.STUDENT_DEFAULT_PASSWORD || "SJCET@123";
};

/**
 * Extracts the batch year from any student register number format.
 * Supports:
 * - SJC24MCA058, LSJC23CS218, TVE22EC010, B23CS001 -> 2024, 2023, 2022, 2023
 * - AD2024001, CS2023015, KTU2023001 -> 2024, 2023, 2023
 * - 2024CS001, 24CS001 -> 2024
 */
export const extractBatchYearFromRegisterNumber = (registerNumber: string): number | null => {
    if (!registerNumber || registerNumber.length < 4) return null;

    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = registerNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // 1. Explicit 4-digit year anywhere after leading letters or at start (e.g. AD2024001, 2024CS001)
    const fourDigitMatch = cleaned.match(/^(?:[A-Z]*)(20\d{2})\d*/);
    if (fourDigitMatch && fourDigitMatch[1]) {
        const year = parseInt(fourDigitMatch[1], 10);
        if (year >= 2000 && year <= 2099) {
            return year;
        }
    }

    // 2. Institution/lateral prefix + 2-digit year + branch/digits (e.g. SJC24MCA058, LSJC23CS218, B23CS001)
    const prefixTwoDigitMatch = cleaned.match(/^[A-Z]+(\d{2})[A-Z0-9]+$/);
    if (prefixTwoDigitMatch && prefixTwoDigitMatch[1]) {
        const twoDigitYear = parseInt(prefixTwoDigitMatch[1], 10);
        if (twoDigitYear >= 0 && twoDigitYear <= 99) {
            return 2000 + twoDigitYear;
        }
    }

    // 3. Leading 2-digit year + letters (e.g. 23CS001, 24MCA012)
    const leadingTwoDigitMatch = cleaned.match(/^(\d{2})[A-Z]{2,}\d+/);
    if (leadingTwoDigitMatch && leadingTwoDigitMatch[1]) {
        const twoDigitYear = parseInt(leadingTwoDigitMatch[1], 10);
        if (twoDigitYear >= 0 && twoDigitYear <= 99) {
            return 2000 + twoDigitYear;
        }
    }

    return null;
};

/**
 * Extracts the program/branch code from any student register number format.
 * Supports:
 * - SJC24MCA058, LSJC23CS218, TVE22EC010, B23CS001 -> MCA, CS, EC, CS
 * - AD2024001 -> AD
 * - 23CS001, 2024MCA012 -> CS, MCA
 */
export const extractProgramCodeFromRegisterNumber = (registerNumber: string): string | null => {
    if (!registerNumber || registerNumber.length < 4) return null;

    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = registerNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // 1. Standard KTU/SJCET format: [Prefix][YY][BRANCH][NUM][optional suffix] (e.g. SJC24MCA058, LSJC23CS218)
    const standardMatch = cleaned.match(/^[A-Z]+\d{2}([A-Z]{2,8})\d+[A-Z]?$/);
    if (standardMatch && standardMatch[1]) {
        return standardMatch[1];
    }

    // 2. Leading year + branch + digits (e.g. 23CS001, 2024MCA012)
    const leadingYearMatch = cleaned.match(/^(?:20)?\d{2}([A-Z]{2,8})\d+[A-Z]?$/);
    if (leadingYearMatch && leadingYearMatch[1]) {
        return leadingYearMatch[1];
    }

    // 3. Branch + 4-digit year + digits (e.g. AD2024001, CS2023015)
    const branchFirstMatch = cleaned.match(/^([A-Z]{2,6})20\d{2}\d+[A-Z]?$/);
    if (branchFirstMatch && branchFirstMatch[1]) {
        return branchFirstMatch[1];
    }

    return null;
};

/**
 * Generates an institutional email based on student details.
 * Format: firstname + [passoutYear] + @ + [programCode] + ".sjcetpalai.ac.in"
 * Example: John Doe (BTech, joining 2022) -> johndoe2026@ce.sjcetpalai.ac.in
 */
export const generateStudentEmail = (fullName: string, joiningYear: number | string, programCode: string, durationYears?: number): string => {
    const cleanName = String(fullName || '').toLowerCase().replace(/[^a-z]/g, '') || 'student';
    const cleanProgram = String(programCode || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'student';

    const parsedYear = typeof joiningYear === 'string' ? parseInt(joiningYear, 10) : joiningYear;
    const joiningYearNum = Number.isFinite(parsedYear) && parsedYear >= 1990 && parsedYear <= 2100
        ? parsedYear
        : new Date().getFullYear();

    // Automatically determine duration if not provided
    let duration = durationYears;
    if (duration === undefined) {
        if (cleanProgram.includes('mca') && (cleanProgram.includes('i') || cleanProgram.includes('int'))) {
            duration = 5; // Integrated MCA
        } else if (cleanProgram.includes('mca') || cleanProgram.includes('mba') || cleanProgram.includes('mtech')) {
            duration = 2; // PG courses
        } else if (cleanProgram.includes('btech') || cleanProgram.includes('be') || cleanProgram.length <= 3) {
            duration = 4; // UG Engineering (AD, CS, CE, EC, EE, ME etc. are often 2-3 letters)
        } else {
            duration = 4; // Default to 4 for others
        }
    }

    const emailYear = joiningYearNum + duration;

    // Check if program is integrated (MCAI, IMCA, or starts with INT)
    const isIntegrated =
        cleanProgram.includes('mcai') ||
        cleanProgram.includes('imca') ||
        cleanProgram.startsWith('int');

    // Normalize program code for email domain (MCAI -> MCA)
    let emailProgramCode = cleanProgram;
    if (cleanProgram === 'mcai' || cleanProgram === 'imca' || cleanProgram.startsWith('intmca')) {
        emailProgramCode = 'mca';
    }

    const integratedSuffix = isIntegrated ? 'i' : '';
    const collegeDomain = process.env.COLLEGE_EMAIL_DOMAIN || 'sjcetpalai.ac.in';

    return `${cleanName}${emailYear}${integratedSuffix}@${emailProgramCode}.${collegeDomain}`;
};
