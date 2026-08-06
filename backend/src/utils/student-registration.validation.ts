/**
 * Student Registration Validation Utility
 * Validates all student registration fields with comprehensive rules
 */

export interface StudentRegistrationValidation {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * College email domain constant
 */
const COLLEGE_EMAIL_DOMAIN = "sjcetpalai.ac.in";

/**
 * Validates full name
 * - Must not be empty
 * - Must be between 2 and 100 characters
 * - Must contain only letters, spaces, hyphens, and apostrophes
 */
export const validateFullName = (fullName: any): { valid: boolean; error?: string } => {
    if (!fullName || typeof fullName !== "string") {
        return { valid: false, error: "Full Name is required" };
    }

    const trimmed = fullName.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: "Full Name must be at least 2 characters long" };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: "Full Name must not exceed 100 characters" };
    }

    // Allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(trimmed)) {
        return { valid: false, error: "Full Name can only contain letters, spaces, hyphens, and apostrophes" };
    }

    return { valid: true };
};

/**
 * Validates email format and college domain
 * - Must be a valid email format
 * - Must belong to sjcetpalai.ac.in domain
 */
export const validateEmail = (email: any): { valid: boolean; error?: string } => {
    if (!email || typeof email !== "string") {
        return { valid: false, error: "Email is required" };
    }

    const trimmed = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: "Email format is invalid" };
    }

    // Check for college domain (supports subdomains like @ce.sjcetpalai.ac.in)
    const domainRegex = /@([a-zA-Z0-9-]+\.)*sjcetpalai\.ac\.in$/i;
    if (!domainRegex.test(trimmed)) {
        return {
            valid: false,
            error: `Email must be from the college domain (@${COLLEGE_EMAIL_DOMAIN})`
        };
    }

    // Validate local part (before @) is not too long
    const emailParts = trimmed.split("@");
    const localPart = emailParts[0];
    if (localPart && localPart.length > 64) {
        return { valid: false, error: "Email local part is too long" };
    }

    return { valid: true };
};

/**
 * Validates register number
 * - Must not be empty
 * - Must be between 4 and 50 characters
 * - Can contain alphanumeric characters, hyphens, and underscores
 */
export const validateRegisterNumber = (registerNumber: any): { valid: boolean; error?: string } => {
    if (!registerNumber || typeof registerNumber !== "string") {
        return { valid: false, error: "Register Number is required" };
    }

    const trimmed = registerNumber.trim().toUpperCase();

    if (trimmed.length < 4) {
        return { valid: false, error: "Register Number must be at least 4 characters long" };
    }

    if (trimmed.length > 50) {
        return { valid: false, error: "Register Number must not exceed 50 characters" };
    }

    // Allow alphanumeric, hyphens, and underscores
    const regNumRegex = /^[A-Z0-9\-_]+$/;
    if (!regNumRegex.test(trimmed)) {
        return { valid: false, error: "Register Number can only contain letters, numbers, hyphens, and underscores" };
    }

    return { valid: true };
};

/**
 * Validates password
 * - Must not be empty
 * - Must be at least 8 characters
 * - Must contain uppercase letters
 * - Must contain lowercase letters
 * - Must contain numbers
 * - Must contain special characters (@, #, $, %, ^, &, etc.)
 */
export const validatePassword = (password: any): { valid: boolean; error?: string } => {
    if (!password || typeof password !== "string") {
        return { valid: false, error: "Password is required" };
    }

    if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters long" };
    }

    if (password.length > 100) {
        return { valid: false, error: "Password must not exceed 100 characters" };
    }

    // Check for uppercase letters
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: "Password must contain at least one uppercase letter" };
    }

    // Check for lowercase letters
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: "Password must contain at least one lowercase letter" };
    }

    // Check for numbers
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: "Password must contain at least one number" };
    }

    // Check for special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, error: "Password must contain at least one special character (@, #, $, %, etc.)" };
    }

    return { valid: true };
};

/**
 * Validates batch year
 * - Must be a valid number
 * - Must be between 2000 and current year + 5
 */
export const validateBatchYear = (batchYear: any): { valid: boolean; error?: string } => {
    if (batchYear === null || batchYear === undefined || batchYear === "") {
        return { valid: false, error: "Batch Year is required" };
    }

    const year = Number(batchYear);

    if (!Number.isFinite(year) || year <= 0) {
        return { valid: false, error: "Batch Year must be a valid number" };
    }

    if (!Number.isInteger(year)) {
        return { valid: false, error: "Batch Year must be an integer" };
    }

    const currentYear = new Date().getFullYear();
    const minYear = 2000;
    const maxYear = currentYear + 5;

    if (year < minYear) {
        return { valid: false, error: `Batch Year must be ${minYear} or later` };
    }

    if (year > maxYear) {
        return { valid: false, error: `Batch Year cannot exceed ${maxYear}` };
    }

    return { valid: true };
};

/**
 * Validates department ID
 * - Must be a valid positive integer
 */
export const validateDepartmentID = (departmentID: any): { valid: boolean; error?: string } => {
    if (departmentID === null || departmentID === undefined || departmentID === "") {
        return { valid: true }; // Now optional
    }

    const id = Number(departmentID);

    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
        return { valid: false, error: "Department must be a valid selection" };
    }

    return { valid: true };
};

/**
 * Validates program ID
 * - Must be a valid positive integer
 */
export const validateProgramID = (programID: any): { valid: boolean; error?: string } => {
    if (programID === null || programID === undefined || programID === "") {
        return { valid: true }; // Now optional
    }

    const id = Number(programID);

    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
        return { valid: false, error: "Program must be a valid selection" };
    }

    return { valid: true };
};

/**
 * Validates password confirmation
 * - Both passwords must match
 */
export const validatePasswordConfirmation = (
    password: string,
    confirmPassword: any
): { valid: boolean; error?: string } => {
    if (!confirmPassword || typeof confirmPassword !== "string") {
        return { valid: false, error: "Password confirmation is required" };
    }

    if (password !== confirmPassword) {
        return { valid: false, error: "Passwords do not match" };
    }

    return { valid: true };
};

/**
 * Complete student registration validation
 * Validates all fields and returns comprehensive error report
 */
export const validateStudentRegistration = (data: {
    FullName: any;
    Email: any;
    RegisterNumber: any;
    DepartmentID: any;
    ProgramID: any;
    BatchYear: any;
    Password: any;
    ConfirmPassword: any;
}): StudentRegistrationValidation => {
    const errors: Record<string, string> = {};

    // Validate Full Name
    const fullNameValidation = validateFullName(data.FullName);
    if (!fullNameValidation.valid) {
        errors.FullName = fullNameValidation.error || "";
    }

    // Validate Email
    const emailValidation = validateEmail(data.Email);
    if (!emailValidation.valid) {
        errors.Email = emailValidation.error || "";
    }

    // Validate Register Number
    const registerValidation = validateRegisterNumber(data.RegisterNumber);
    if (!registerValidation.valid) {
        errors.RegisterNumber = registerValidation.error || "";
    }

    // Validate Batch Year
    const batchYearValidation = validateBatchYear(data.BatchYear);
    if (!batchYearValidation.valid) {
        errors.BatchYear = batchYearValidation.error || "";
    }

    // Validate Department ID
    const deptValidation = validateDepartmentID(data.DepartmentID);
    if (!deptValidation.valid) {
        errors.DepartmentID = deptValidation.error || "";
    }

    // Validate Program ID
    const progValidation = validateProgramID(data.ProgramID);
    if (!progValidation.valid) {
        errors.ProgramID = progValidation.error || "";
    }

    // Validate Password
    const passwordValidation = validatePassword(data.Password);
    if (!passwordValidation.valid) {
        errors.Password = passwordValidation.error || "";
    }

    // Validate Password Confirmation
    if (passwordValidation.valid) {
        const confirmValidation = validatePasswordConfirmation(data.Password, data.ConfirmPassword);
        if (!confirmValidation.valid) {
            errors.ConfirmPassword = confirmValidation.error || "";
        }
    } else if (!data.ConfirmPassword) {
        errors.ConfirmPassword = "Password confirmation is required";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
