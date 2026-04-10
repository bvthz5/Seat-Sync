/**
 * Invigilator Request Access Validation Utility
 * Validates all invigilator request fields with comprehensive rules
 */

export interface InvigilatorRequestValidation {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Validates Faculty ID
 * - Must not be empty
 * - Must be 3-20 characters
 * - Can contain alphanumeric and hyphens/underscores
 */
export const validateFacultyID = (facultyID: any): { valid: boolean; error?: string } => {
    if (!facultyID || typeof facultyID !== "string") {
        return { valid: false, error: "Faculty ID is required" };
    }

    const trimmed = facultyID.trim();

    if (trimmed.length < 3) {
        return { valid: false, error: "Faculty ID must be at least 3 characters long" };
    }

    if (trimmed.length > 20) {
        return { valid: false, error: "Faculty ID must not exceed 20 characters" };
    }

    const idRegex = /^[A-Z0-9\-_]+$/i;
    if (!idRegex.test(trimmed)) {
        return { valid: false, error: "Faculty ID can only contain letters, numbers, hyphens, and underscores" };
    }

    return { valid: true };
};

/**
 * Validates faculty name
 * - Must not be empty
 * - Must be 2-100 characters
 * - Can contain letters, spaces, hyphens, apostrophes, and dots
 */
export const validateFacultyName = (name: any): { valid: boolean; error?: string } => {
    if (!name || typeof name !== "string") {
        return { valid: false, error: "Full Name is required" };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: "Full Name must be at least 2 characters long" };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: "Full Name must not exceed 100 characters" };
    }

    // Allow letters, spaces, hyphens, apostrophes, and dots (for prefixes like Dr.)
    const nameRegex = /^[a-zA-Z\s\-'.]+$/;
    if (!nameRegex.test(trimmed)) {
        return { valid: false, error: "Full Name can only contain letters, spaces, hyphens, apostrophes, and dots" };
    }

    return { valid: true };
};

/**
 * Validates email format
 * - Must be valid email format
 * - Must be from college domain: sjcetpalai.ac.in
 */
export const validateFacultyEmail = (email: any): { valid: boolean; error?: string } => {
    if (!email || typeof email !== "string") {
        return { valid: false, error: "Official Email is required" };
    }

    const trimmed = email.trim().toLowerCase();

    // RFC 5322 simplified email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: "Email format is invalid" };
    }

    // Validate local part (before @) is not too long
    const emailParts = trimmed.split("@");
    const localPart = emailParts[0];
    if (localPart && localPart.length > 64) {
        return { valid: false, error: "Email local part is too long" };
    }

    // Validate domain part (after @) is not too long
    const domainPart = emailParts[1];
    if (domainPart && domainPart.length > 255) {
        return { valid: false, error: "Email domain is too long" };
    }

    // Validate college email domain
    const collegeEmail = "sjcetpalai.ac.in";
    if (domainPart !== collegeEmail) {
        return { valid: false, error: `Email must be from the official college domain (${collegeEmail})` };
    }

    return { valid: true };
};

/**
 * Validates department selection
 * - Must be a non-empty string (department code)
 */
export const validateDepartment = (department: any): { valid: boolean; error?: string } => {
    if (!department || typeof department !== "string" || department.trim() === "") {
        return { valid: false, error: "Department is required" };
    }

    if (department.trim().length === 0) {
        return { valid: false, error: "Department must be selected" };
    }

    return { valid: true };
};

/**
 * Validates phone number (optional but if provided, must be valid)
 * - 10-15 digits
 * - Can start with + for international format
 * - Can contain spaces, hyphens, parentheses
 */
export const validatePhone = (phone: any): { valid: boolean; error?: string } => {
    if (!phone || phone === "") {
        // Phone is optional
        return { valid: true };
    }

    if (typeof phone !== "string") {
        return { valid: false, error: "Phone must be a valid format" };
    }

    const trimmed = phone.trim();

    // Remove common separators for validation
    const digitsOnly = trimmed.replace(/[\s\-()]+/g, "");

    // Check if it starts with + (international)
    if (trimmed.startsWith("+")) {
        // International format: + followed by digits
        if (!/^\+\d{7,15}$/.test(trimmed.replace(/[\s\-()]+/g, ""))) {
            return { valid: false, error: "Phone number must be between 7-15 digits for international format" };
        }
    } else {
        // Domestic format: 10-15 digits
        if (!/^\d{10,15}$/.test(digitsOnly)) {
            return { valid: false, error: "Phone number must be between 10-15 digits" };
        }
    }

    return { valid: true };
};

/**
 * Validates designation (optional)
 * - If provided, must be 2-50 characters
 * - Can contain letters, spaces, hyphens, dots, and parentheses
 */
export const validateDesignation = (designation: any): { valid: boolean; error?: string } => {
    if (!designation || designation === "") {
        // Designation is optional
        return { valid: true };
    }

    if (typeof designation !== "string") {
        return { valid: false, error: "Designation must be a valid format" };
    }

    const trimmed = designation.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: "Designation must be at least 2 characters long" };
    }

    if (trimmed.length > 50) {
        return { valid: false, error: "Designation must not exceed 50 characters" };
    }

    // Allow letters, spaces, hyphens, dots, parentheses (for academic titles)
    const designationRegex = /^[a-zA-Z\s\-().]+$/;
    if (!designationRegex.test(trimmed)) {
        return { valid: false, error: "Designation can only contain letters, spaces, hyphens, dots, and parentheses" };
    }

    return { valid: true };
};

/**
 * Validates reason (optional)
 * - If provided, must be 10-500 characters
 * - Cannot contain only numbers or special characters
 */
export const validateReason = (reason: any): { valid: boolean; error?: string } => {
    if (!reason || reason === "") {
        // Reason is optional
        return { valid: true };
    }

    if (typeof reason !== "string") {
        return { valid: false, error: "Reason must be a valid text" };
    }

    const trimmed = reason.trim();

    if (trimmed.length < 10) {
        return { valid: false, error: "Reason must be at least 10 characters long" };
    }

    if (trimmed.length > 500) {
        return { valid: false, error: "Reason must not exceed 500 characters" };
    }

    // Must contain at least some letters or common words
    if (!/[a-zA-Z]/.test(trimmed)) {
        return { valid: false, error: "Reason must contain meaningful text" };
    }

    return { valid: true };
};

/**
 * Complete invigilator request validation
 */
export const validateInvigilatorRequest = (data: {
    FacultyID: any;
    Name: any;
    Email: any;
    Phone: any;
    Department: any;
    Designation: any;
    Reason: any;
}): InvigilatorRequestValidation => {
    const errors: Record<string, string> = {};

    // Validate required fields
    const facultyIDValidation = validateFacultyID(data.FacultyID);
    if (!facultyIDValidation.valid) {
        errors.FacultyID = facultyIDValidation.error || "";
    }

    const nameValidation = validateFacultyName(data.Name);
    if (!nameValidation.valid) {
        errors.Name = nameValidation.error || "";
    }

    const emailValidation = validateFacultyEmail(data.Email);
    if (!emailValidation.valid) {
        errors.Email = emailValidation.error || "";
    }

    const departmentValidation = validateDepartment(data.Department);
    if (!departmentValidation.valid) {
        errors.Department = departmentValidation.error || "";
    }

    // Validate optional fields
    const phoneValidation = validatePhone(data.Phone);
    if (!phoneValidation.valid) {
        errors.Phone = phoneValidation.error || "";
    }

    const designationValidation = validateDesignation(data.Designation);
    if (!designationValidation.valid) {
        errors.Designation = designationValidation.error || "";
    }

    const reasonValidation = validateReason(data.Reason);
    if (!reasonValidation.valid) {
        errors.Reason = reasonValidation.error || "";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
