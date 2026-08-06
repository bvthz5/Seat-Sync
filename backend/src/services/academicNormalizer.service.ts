import { Op, Transaction } from 'sequelize';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';
import ProgramDepartment from '../models/ProgramDepartment.js';

export interface NormalizedAcademicInfo {
  programCode: string;
  batchYear: number | null;
  batchEndYear: number | null;
  batchName: string | null;
  division: string | null;
  semester: number | null;
  semesterName: string | null;
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

export const getDepartmentCodeFromProgram = (programCode: string): string => {
    const normalized = normalizeProgram(programCode);
    const map: Record<string, string> = {
        "MCA": "CA",
        "INT_MCA": "CA"
    };
    return map[normalized] || normalized;
};

export const parseBatchString = (batchText: unknown): NormalizedAcademicInfo => {
    const text = String(batchText || '').trim();
    if (!text) {
        return { programCode: 'UNKNOWN', batchYear: null, batchEndYear: null, batchName: null, division: null, semester: null, semesterName: null };
    }

    // 1. Remove "Batch :" prefix if exists
    const cleanText = text.replace(/^Batch\s*:\s*/i, '').trim();

    // 2. Extract first word -> Program
    const programMatch = cleanText.split(/\s+/)[0];
    let programCode = programMatch ? normalizeProgram(programMatch) : 'UNKNOWN';

    // 3. Extract Batch Years (e.g. 2023-2027)
    let batchYear: number | null = null;
    let batchEndYear: number | null = null;
    const rangeMatch = cleanText.match(/(20\d{2})\s*[-–]\s*(20\d{2})/);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
        batchYear = parseInt(rangeMatch[1], 10);
        batchEndYear = parseInt(rangeMatch[2], 10);
    } else {
        const yearMatch = cleanText.match(/(20\d{2})/);
        if (yearMatch && yearMatch[1]) {
            batchYear = parseInt(yearMatch[1], 10);
        }
    }

    const batchName = programCode !== 'UNKNOWN' && batchYear
        ? `${programCode} ${batchYear}${batchEndYear ? '-' + batchEndYear : ''}`
        : null;

    // 4. Extract Division (e.g. "A", "B", "C" in "CSE 2023-2027 A (S3)")
    let division: string | null = null;
    const divMatch = cleanText.match(/\b([A-Z])\b(?=\s*\([S\d\s]+\)|\s*$)/i) || cleanText.match(/(?:DIV|DIVISION|SEC|SECTION)\s*([A-Z])/i);
    if (divMatch && divMatch[1] && divMatch[1].length === 1 && !['S', 'V', 'T'].includes(divMatch[1].toUpperCase())) {
        division = divMatch[1].toUpperCase();
    }

    // 5. Extract Semester (e.g. S3, S7, Sem 3, (S3), S-3)
    let semester: number | null = null;
    const semMatch = 
        cleanText.match(/\(S\s*[-_]?\s*(\d+)\)/i) ||
        cleanText.match(/\bS\s*[-_]?\s*(\d+)\b/i) ||
        cleanText.match(/Sem(?:ester)?\s*[-_]?\s*(\d+)/i) ||
        cleanText.match(/S(\d+)/i);
        
    if (semMatch && semMatch[1]) {
        semester = parseInt(semMatch[1], 10);
    }

    const semesterName = semester ? `S${semester}` : null;

    return { programCode, batchYear, batchEndYear, batchName, division, semester, semesterName };
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
  const programNorm = normalizeProgram(programCode);
  const deptCode = getDepartmentCodeFromProgram(programNorm);

  // 1. Try to find by Code first (fastest)
  let department = await Department.findOne({
    where: { DepartmentCode: deptCode },
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
      DepartmentCode: deptCode,
      DepartmentName: departmentName,
      IsActive: true
    }, { transaction: t || null });
  }
  
  return department;
};
