/**
 * Invigilator Request Access Validation Utility (Frontend)
 * Validates all invigilator request fields with comprehensive rules
 */

export interface ValidationError {
  [key: string]: string;
}

/**
 * Validates Faculty ID
 */
export const validateFacultyID = (facultyID: string): string | null => {
  if (!facultyID || !facultyID.trim()) {
    return "Faculty ID is required";
  }

  const trimmed = facultyID.trim();

  if (trimmed.length < 3) {
    return "Faculty ID must be at least 3 characters long";
  }

  if (trimmed.length > 20) {
    return "Faculty ID must not exceed 20 characters";
  }

  const idRegex = /^[A-Z0-9\-_]+$/i;
  if (!idRegex.test(trimmed)) {
    return "Faculty ID can only contain letters, numbers, hyphens, and underscores";
  }

  return null;
};

/**
 * Validates faculty name
 */
export const validateFacultyName = (name: string): string | null => {
  if (!name || !name.trim()) {
    return "Full Name is required";
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return "Full Name must be at least 2 characters long";
  }

  if (trimmed.length > 100) {
    return "Full Name must not exceed 100 characters";
  }

  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(trimmed)) {
    return "Full Name can only contain letters, spaces, hyphens, apostrophes, and dots";
  }

  return null;
};

/**
 * Validates email format
 */
export const validateFacultyEmail = (email: string): string | null => {
  if (!email || !email.trim()) {
    return "Official Email is required";
  }

  const trimmed = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return "Email format is invalid";
  }

  const emailParts = trimmed.split("@");
  const localPart = emailParts[0];
  if (localPart && localPart.length > 64) {
    return "Email local part is too long";
  }

  const domainPart = emailParts[1];
  if (domainPart && domainPart.length > 255) {
    return "Email domain is too long";
  }

  // Validate college email domain
  const collegeEmail = "sjcetpalai.ac.in";
  if (domainPart !== collegeEmail) {
    return `Email must be from the official college domain (${collegeEmail})`;
  }

  return null;
};

/**
 * Validates department selection
 */
export const validateDepartment = (department: string | number): string | null => {
  if (!department || (typeof department === "string" && department.trim() === "")) {
    return "Department is required";
  }

  return null;
};

/**
 * Validates phone number (optional but if provided, must be valid)
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone || phone.trim() === "") {
    // Phone is optional
    return null;
  }

  const trimmed = phone.trim();

  // Remove common separators for validation
  const digitsOnly = trimmed.replace(/[\s\-()]+/g, "");

  // Check if it starts with + (international)
  if (trimmed.startsWith("+")) {
    if (!/^\+\d{7,15}$/.test(digitsOnly)) {
      return "Phone number must be between 7-15 digits for international format";
    }
  } else {
    // Domestic format: 10-15 digits
    if (!/^\d{10,15}$/.test(digitsOnly)) {
      return "Phone number must be between 10-15 digits";
    }
  }

  return null;
};

/**
 * Validates designation (optional)
 */
export const validateDesignation = (designation: string): string | null => {
  if (!designation || designation.trim() === "") {
    // Designation is optional
    return null;
  }

  const trimmed = designation.trim();

  if (trimmed.length < 2) {
    return "Designation must be at least 2 characters long";
  }

  if (trimmed.length > 50) {
    return "Designation must not exceed 50 characters";
  }

  const designationRegex = /^[a-zA-Z\s\-().]+$/;
  if (!designationRegex.test(trimmed)) {
    return "Designation can only contain letters, spaces, hyphens, dots, and parentheses";
  }

  return null;
};

/**
 * Validates reason (optional)
 */
export const validateReason = (reason: string): string | null => {
  if (!reason || reason.trim() === "") {
    // Reason is optional
    return null;
  }

  const trimmed = reason.trim();

  if (trimmed.length < 10) {
    return "Reason must be at least 10 characters long";
  }

  if (trimmed.length > 500) {
    return "Reason must not exceed 500 characters";
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return "Reason must contain meaningful text";
  }

  return null;
};

/**
 * Complete validation for all form fields
 */
export const validateInvigilatorRequestForm = (formData: {
  FacultyID: string;
  Name: string;
  Email: string;
  Phone: string;
  Department: string | number;
  Designation: string;
  Reason: string;
}): ValidationError => {
  const errors: ValidationError = {};

  const facultyIDError = validateFacultyID(formData.FacultyID);
  if (facultyIDError) errors.FacultyID = facultyIDError;

  const nameError = validateFacultyName(formData.Name);
  if (nameError) errors.Name = nameError;

  const emailError = validateFacultyEmail(formData.Email);
  if (emailError) errors.Email = emailError;

  const departmentError = validateDepartment(formData.Department);
  if (departmentError) errors.Department = departmentError;

  const phoneError = validatePhone(formData.Phone);
  if (phoneError) errors.Phone = phoneError;

  const designationError = validateDesignation(formData.Designation);
  if (designationError) errors.Designation = designationError;

  const reasonError = validateReason(formData.Reason);
  if (reasonError) errors.Reason = reasonError;

  return errors;
};

/**
 * Validates a single field in real-time
 */
export const validateField = (fieldName: string, value: any): string | null => {
  switch (fieldName) {
    case "FacultyID":
      return validateFacultyID(value);
    case "Name":
      return validateFacultyName(value);
    case "Email":
      return validateFacultyEmail(value);
    case "Phone":
      return validatePhone(value);
    case "Department":
      return validateDepartment(value);
    case "Designation":
      return validateDesignation(value);
    case "Reason":
      return validateReason(value);
    default:
      return null;
  }
};
