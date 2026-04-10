/**
 * Student Registration Validation Utility (Frontend)
 * Validates all student registration fields with comprehensive rules
 */

export interface ValidationError {
  [key: string]: string;
}

const COLLEGE_EMAIL_DOMAIN = "sjcetpalai.ac.in";

/**
 * Validates full name
 */
export const validateFullName = (fullName: string): string | null => {
  if (!fullName || !fullName.trim()) {
    return "Full Name is required";
  }

  const trimmed = fullName.trim();

  if (trimmed.length < 2) {
    return "Full Name must be at least 2 characters long";
  }

  if (trimmed.length > 100) {
    return "Full Name must not exceed 100 characters";
  }

  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmed)) {
    return "Full Name can only contain letters, spaces, hyphens, and apostrophes";
  }

  return null;
};

/**
 * Validates email format and college domain
 */
export const validateEmail = (email: string): string | null => {
  if (!email || !email.trim()) {
    return "Email is required";
  }

  const trimmed = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return "Email format is invalid";
  }

  if (!trimmed.endsWith(`@${COLLEGE_EMAIL_DOMAIN}`)) {
    return `Email must be from the college domain (@${COLLEGE_EMAIL_DOMAIN})`;
  }

  const localPart = trimmed.split("@")[0];
  if (localPart.length > 64) {
    return "Email local part is too long";
  }

  return null;
};

/**
 * Validates register number
 */
export const validateRegisterNumber = (registerNumber: string): string | null => {
  if (!registerNumber || !registerNumber.trim()) {
    return "Register Number is required";
  }

  const trimmed = registerNumber.trim().toUpperCase();

  if (trimmed.length < 4) {
    return "Register Number must be at least 4 characters long";
  }

  if (trimmed.length > 50) {
    return "Register Number must not exceed 50 characters";
  }

  const regNumRegex = /^[A-Z0-9\-_]+$/;
  if (!regNumRegex.test(trimmed)) {
    return "Register Number can only contain letters, numbers, hyphens, and underscores";
  }

  return null;
};

/**
 * Validates password with strength requirements
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (password.length > 100) {
    return "Password must not exceed 100 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z)";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z)";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9)";
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character (@, #, $, %, !, etc.)";
  }

  return null;
};

/**
 * Validates batch year
 */
export const validateBatchYear = (batchYear: string | number): string | null => {
  if (batchYear === null || batchYear === undefined || batchYear === "") {
    return "Batch Year is required";
  }

  const year = Number(batchYear);

  if (!Number.isFinite(year) || year <= 0) {
    return "Batch Year must be a valid number";
  }

  if (!Number.isInteger(year)) {
    return "Batch Year must be an integer";
  }

  const currentYear = new Date().getFullYear();
  const minYear = 2000;
  const maxYear = currentYear + 5;

  if (year < minYear) {
    return `Batch Year must be ${minYear} or later`;
  }

  if (year > maxYear) {
    return `Batch Year cannot exceed ${maxYear}`;
  }

  return null;
};

/**
 * Validates department selection
 */
export const validateDepartmentID = (departmentID: string | number): string | null => {
  if (departmentID === null || departmentID === undefined || departmentID === "") {
    return "Department is required";
  }

  const id = Number(departmentID);

  if (!Number.isFinite(id) || id <= 0) {
    return "Department must be a valid selection";
  }

  return null;
};

/**
 * Validates program selection
 */
export const validateProgramID = (programID: string | number): string | null => {
  if (programID === null || programID === undefined || programID === "") {
    return "Program is required";
  }

  const id = Number(programID);

  if (!Number.isFinite(id) || id <= 0) {
    return "Program must be a valid selection";
  }

  return null;
};

/**
 * Validates password confirmation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): string | null => {
  if (!confirmPassword) {
    return "Password confirmation is required";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  return null;
};

/**
 * Complete validation for all form fields
 */
export const validateRegistrationForm = (formData: {
  FullName: string;
  Email: string;
  RegisterNumber: string;
  DepartmentID: string | number;
  ProgramID: string | number;
  BatchYear: string | number;
  Password: string;
  ConfirmPassword: string;
}): ValidationError => {
  const errors: ValidationError = {};

  const fullNameError = validateFullName(formData.FullName);
  if (fullNameError) errors.FullName = fullNameError;

  const emailError = validateEmail(formData.Email);
  if (emailError) errors.Email = emailError;

  const registerError = validateRegisterNumber(formData.RegisterNumber);
  if (registerError) errors.RegisterNumber = registerError;

  const batchYearError = validateBatchYear(formData.BatchYear);
  if (batchYearError) errors.BatchYear = batchYearError;

  const deptError = validateDepartmentID(formData.DepartmentID);
  if (deptError) errors.DepartmentID = deptError;

  const progError = validateProgramID(formData.ProgramID);
  if (progError) errors.ProgramID = progError;

  const passwordError = validatePassword(formData.Password);
  if (passwordError) errors.Password = passwordError;

  const confirmError = validatePasswordConfirmation(formData.Password, formData.ConfirmPassword);
  if (confirmError) errors.ConfirmPassword = confirmError;

  return errors;
};

/**
 * Validates a single field in real-time
 */
export const validateField = (
  fieldName: string,
  value: any,
  otherFieldValue?: any
): string | null => {
  switch (fieldName) {
    case "FullName":
      return validateFullName(value);
    case "Email":
      return validateEmail(value);
    case "RegisterNumber":
      return validateRegisterNumber(value);
    case "Password":
      return validatePassword(value);
    case "BatchYear":
      return validateBatchYear(value);
    case "DepartmentID":
      return validateDepartmentID(value);
    case "ProgramID":
      return validateProgramID(value);
    case "ConfirmPassword":
      return validatePasswordConfirmation(otherFieldValue || "", value);
    default:
      return null;
  }
};
