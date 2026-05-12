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
    // Assuming 00-30 is 2000-2030, 31-99 is 1931-1999 (or could be future)
    // For educational context, assume years in range 20-40 map to 2020-2040
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
 * Example: SJC22BTECH456 -> BTECH
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
 * Format: firstname + lastname + (joiningYear + durationYears) + @ + programCode + ".sjcetpalai.ac.in"
 * For BTech (4 years): joiningYear + 4
 * For other programs (2 years): joiningYear + 2
 * Example: John Doe (BTech, joining 2022) -> johndoe2026@btech.sjcetpalai.ac.in
 * Example: John Doe (MCA, joining 2024) -> johndoe2026@mca.sjcetpalai.ac.in
 */
export const generateStudentEmail = (fullName: string, joiningYear: number | string, programCode: string, durationYears?: number): string => {
    const cleanName = fullName.toLowerCase().replace(/\s/g, '');
    const cleanProgram = programCode.toLowerCase().replace(/\s/g, '');
    
    const joiningYearNum = typeof joiningYear === 'string' ? parseInt(joiningYear, 10) : joiningYear;
    // Default to 2 years if durationYears not provided, BTech uses 4 years
    const duration = durationYears || 2;
    const emailYear = joiningYearNum + duration;
    
    return `${cleanName}${emailYear}@${cleanProgram}.sjcetpalai.ac.in`;
};
