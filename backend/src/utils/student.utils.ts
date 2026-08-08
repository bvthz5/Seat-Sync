/**
 * Generates a standardized universal default password for all students.
 * Formula: Fixed institutional password
 * Example: SJCET@123
 */
export const generateDefaultPassword = (_fullName: string, _registerNumber: string): string => {
    // Standardized universal password for all students as requested
    return "SJCET@123";
};

/**
 * Extracts the batch year from a register number.
 * Format: SJC[YY]PROGRAM[NUMBER] -> YY is the batch year (last 2 digits of joining year)
 * Example: SJC24MCA058 -> 2024 (where 24 = 2024)
 */
export const extractBatchYearFromRegisterNumber = (registerNumber: string): number | null => {
    if (!registerNumber || registerNumber.length < 5) return null;
    
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = registerNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Extract digits at position 3-4 (after institution code like "SJC")
    const batchYearMatch = cleaned.match(/^[A-Z]+(\d{2})/);
    if (!batchYearMatch || !batchYearMatch[1]) return null;
    
    const twoDigitYear = parseInt(batchYearMatch[1], 10);
    
    // Convert 2-digit year to 4-digit year
    if (twoDigitYear >= 20 && twoDigitYear <= 99) {
        return 2000 + twoDigitYear;
    } else if (twoDigitYear >= 0 && twoDigitYear <= 19) {
        return 2000 + twoDigitYear;
    }
    
    return null;
};

/**
 * Extracts the program code from a register number.
 * Format: SJC[YY]PROGRAM[NUMBER] -> PROGRAM is the program code
 * Example: SJC24MCA058 -> MCA
 */
export const extractProgramCodeFromRegisterNumber = (registerNumber: string): string | null => {
    if (!registerNumber || registerNumber.length < 7) return null;
    
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = registerNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Skip institution code (e.g., "SJC") and year digits (e.g., "24")
    // Pattern: [A-Z]+ (institution) + \d{2} (year) + ([A-Z]+) (program)
    const programMatch = cleaned.match(/^[A-Z]+\d{2}([A-Z]+)\d+$/);
    if (!programMatch || !programMatch[1]) return null;
    
    return programMatch[1];
};

/**
 * Generates an institutional email based on student details.
 * Format: firstname + [passoutYear] + @ + [programCode] + ".sjcetpalai.ac.in"
 * Example: John Doe (BTech, joining 2022) -> johndoe2026@ce.sjcetpalai.ac.in
 */
export const generateStudentEmail = (fullName: string, joiningYear: number | string, programCode: string, durationYears?: number): string => {
    const cleanName = fullName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanProgram = programCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const joiningYearNum = typeof joiningYear === 'string' ? parseInt(joiningYear, 10) : joiningYear;
    
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
    
    // Map AD to ADS or keep as is? User example had 'ce'.
    // We'll keep it as the program code for now as it's the standard.
    
    const integratedSuffix = isIntegrated ? 'i' : '';
    
    return `${cleanName}${emailYear}${integratedSuffix}@${emailProgramCode}.sjcetpalai.ac.in`;
};
