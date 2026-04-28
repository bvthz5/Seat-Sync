/**
 * Generates a standardized default password for a student.
 * Formula: first 4 letters of name + last 4 digits of register number + "@"
 * Example: Rahul Kumar (SJC22CS045) -> Rahu5045@
 */
export const generateDefaultPassword = (fullName: string, registerNumber: string): string => {
    // Normalize name: remove spaces, take first 4 chars, capitalize first letter
    const cleanName = fullName.replace(/\s/g, '');
    const namePart = cleanName.substring(0, 4).charAt(0).toUpperCase() + cleanName.substring(1, 4).toLowerCase();
    
    // Normalize register number: extract ONLY digits
    const digitsOnly = registerNumber.replace(/\D/g, '');
    const regPart = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : digitsOnly.padStart(4, '0');
    
    // Combine: e.g., Abis5001@
    return `${namePart}${regPart}@`;
};
