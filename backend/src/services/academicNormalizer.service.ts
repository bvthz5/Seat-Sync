import { Op, Transaction } from 'sequelize';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';
import ProgramDepartment from '../models/ProgramDepartment.js';

export interface NormalizedAcademicInfo {
  programCode: string;
  batchYear: number | null;
  semester: number | null;
}

export const PROGRAM_DEPARTMENT_MAP: Record<string, string> = {
  "CSE": "Computer Science & Engineering",
  "AI&DS": "Artificial Intelligence & Data Science",
  "ECE": "Electronics & Communication Engineering",
  "EEE": "Electrical & Electronics Engineering",
  "ME": "Mechanical Engineering",
  "CE": "Civil Engineering",
  "CY": "Cyber Security",
  "CT": "Computer Technology",
  "MCA": "Computer Applications",
  "INT_MCA": "Computer Applications",
  "MBA": "Management Studies",
  "BHM": "Hotel Management"
};

export const normalizeProgram = (programCode: string): string => {
    if (!programCode) return "UNKNOWN";
    let cleaned = programCode.toUpperCase().trim();
    // Special handling for INT_MCA or AI&DS since they have special characters
    if (cleaned.includes('INT_MCA') || cleaned.includes('INT MCA')) return 'INT_MCA';
    if (cleaned.includes('AI&DS') || cleaned.includes('AIDS')) return 'AI&DS';
    // Just keep A-Z letters for everything else
    const alphaOnly = cleaned.replace(/[^A-Z]/g, '');
    return alphaOnly || "UNKNOWN";
};

export const mapProgramToDepartment = (programCode: string): string => {
    const normalized = normalizeProgram(programCode);
    return PROGRAM_DEPARTMENT_MAP[normalized] || normalized; // Fallback to code if not found
};

export const parseBatchString = (batchText: unknown): NormalizedAcademicInfo => {
    const text = String(batchText || '').trim();
    if (!text) {
        return { programCode: 'UNKNOWN', batchYear: null, semester: null };
    }

    // 1. Remove "Batch :" prefix if exists
    const cleanText = text.replace(/^Batch\s*:\s*/i, '').trim();

    // 2. Extract first word -> Program
    // Sometimes it's INT_MCA, CSE, etc.
    const programMatch = cleanText.split(/\s+/)[0];
    let programCode = programMatch ? normalizeProgram(programMatch) : 'UNKNOWN';

    // 3. Extract 4-digit year -> BatchYear
    let batchYear: number | null = null;
    const yearMatch = cleanText.match(/(20\d{2})/);
    if (yearMatch && yearMatch[1]) {
        batchYear = parseInt(yearMatch[1], 10);
    }

    // 4. Extract (S1) -> Semester
    let semester: number | null = null;
    const semMatch = cleanText.match(/S(\d+)/i);
    if (semMatch && semMatch[1]) {
        semester = parseInt(semMatch[1], 10);
    }

    return { programCode, batchYear, semester };
};

export const defaultByType = (code: string): number => {
  const upperCode = code.toUpperCase();
  if (['BHM'].includes(upperCode)) return 3;
  if (['MBA', 'MCA'].includes(upperCode)) return 2;
  if (['BTECH', 'BE'].includes(upperCode)) return 4;
  return 3;
};

export const resolveOrCreateProgram = async (programCode: string, t?: Transaction) => {
  const code = normalizeProgram(programCode);
  const deptName = mapProgramToDepartment(code);
  let department = await resolveOrCreateDepartment(code, deptName, t);

  let program = await Program.findOne({ 
    where: { ProgramCode: code },
    transaction: t || null
  });
  
  if (!program) {
    const durationMap: Record<string, number> = {
        "MCA": 2, "MBA": 2, "INT_MCA": 5, "BHM": 3, "BTECH": 4
    };
    const dur = durationMap[code] || 3;
    program = await Program.create({
      ProgramName: code,
      ProgramCode: code,
      DepartmentID: department.DepartmentID,
      DurationYears: dur,
      TotalSemesters: dur * 2,
      IsActive: true
    }, { transaction: t || null });
  }

  // Ensure bridge table entry is active (M:N relationship) 
  await ProgramDepartment.findOrCreate({
    where: {
      ProgramID: program.ProgramID,
      DepartmentID: department.DepartmentID
    },
    transaction: t || null,
    defaults: {
      ProgramID: program.ProgramID,
      DepartmentID: department.DepartmentID
    }
  });

  return program;
};

export const resolveOrCreateDepartment = async (programCode: string, departmentName: string, t?: Transaction) => {
  const code = normalizeProgram(programCode);
  
  // 1. Try to find by Code first (fastest)
  let department = await Department.findOne({ 
    where: { DepartmentCode: code },
    transaction: t || null
  });
  
  // 2. If not found by code, try finding by Name (to prevent "Computer Applications" duplicates)
  if (!department) {
    department = await Department.findOne({
      where: { DepartmentName: departmentName },
      transaction: t || null
    });
  }
  
  // 3. If still not found, create it
  if (!department) {
    department = await Department.create({
      DepartmentCode: code,
      DepartmentName: departmentName,
      IsActive: true
    }, { transaction: t || null });
  }
  
  return department;
};
