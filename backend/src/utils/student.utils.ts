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
 * Generates an institutional email based on student details.
 * Format: nameYear@program.sjcetpalai.ac.in
 * Example: Binil Vincent (2026, MCA) -> binilvincent2026@mca.sjcetpalai.ac.in
 */
export const generateStudentEmail = (fullName: string, batchYear: number | string, programCode: string): string => {
    const cleanName = fullName.toLowerCase().replace(/\s/g, '');
    const cleanProgram = programCode.toLowerCase().replace(/\s/g, '');
    return `${cleanName}${batchYear}@${cleanProgram}.sjcetpalai.ac.in`;
};
