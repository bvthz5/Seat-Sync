import { Op, Transaction } from 'sequelize';
import { Program } from '../models/Program.js';
import { Department } from '../models/Department.js';
import ProgramDepartment from '../models/ProgramDepartment.js';

export interface NormalizedAcademicInfo {
  programCode: string; // 'BTECH' | 'MCA' | 'INT_MCA' | 'MBA' | 'MTECH' | 'PHD'
  programmeLabel: string; // 'B.Tech' | 'MCA' | 'Int. MCA' | 'MBA' | 'M.Tech' | 'PhD'
  rawBranch: string;
  normalizedBranchCode: string;
  departmentCode: string;
  departmentName: string;
  batchYear: number | null;
  batchEndYear: number | null;
  batchName: string | null;
  division: string | null; // null for cohorts without division (e.g. CA, MCA, INT MCA)
  semester: number | null;
  semesterName: string | null;
}

export const PROGRAM_DEPARTMENT_MAP: Record<string, string> = {
  "CS": "Computer Science & Engineering",
  "CSE": "Computer Science & Engineering",
  "AD": "Artificial Intelligence & Data Science",
  "AI&DS": "Artificial Intelligence & Data Science",
  "AIDS": "Artificial Intelligence & Data Science",
  "EC": "Electronics & Communication Engineering",
  "ECE": "Electronics & Communication Engineering",
  "EE": "Electrical & Electronics Engineering",
  "EEE": "Electrical & Electronics Engineering",
  "ME": "Mechanical Engineering",
  "MECH": "Mechanical Engineering",
  "CE": "Civil Engineering",
  "CIVIL": "Civil Engineering",
  "CA": "Computer Applications (B.Tech)",
  "CC": "Computer Science (Cyber Security)",
  "CY": "Cyber Security",
  "CT": "Computer Technology",
  "ER": "Electronics & Robotics",
  "RA": "Robotics & Automation",
  "MCA": "Master of Computer Applications",
  "INT_MCA": "Integrated Master of Computer Applications",
  "MBA": "Management Studies",
  "BHM": "Hotel Management",
  "MTECH": "Master of Technology",
  "PHD": "Doctor of Philosophy"
};

/**
 * Centralized Canonical Normalization for Programmes
 * Output: 'BTECH' | 'MCA' | 'INT_MCA' | 'MTECH' | 'MBA' | 'BHM' | 'PHD'
 */
export const normalizeProgramme = (progInput: unknown): string => {
    if (!progInput) return 'BTECH';
    const clean = String(progInput).toUpperCase().trim();
    if (clean.includes('INT_MCA') || clean.includes('INT MCA') || clean.includes('INT. MCA') || clean.includes('INTEGRATED MCA') || clean.includes('INMCA') || clean.includes('IMCA')) {
        return 'INT_MCA';
    }
    if (clean.includes('MCA') || clean.includes('M.C.A')) return 'MCA';
    if (clean.includes('B.TECH') || clean.includes('BTECH') || clean.includes('B TECH') || clean.includes('BACHELOR OF TECHNOLOGY') || clean.includes('ENGINEERING')) return 'BTECH';
    if (clean.includes('M.TECH') || clean.includes('MTECH') || clean.includes('M TECH') || clean.includes('MASTER OF TECHNOLOGY') || clean.includes('PGR') || clean.includes('PGL') || clean.includes('AMPM')) return 'MTECH';
    if (clean.includes('MBA') || clean.includes('M.B.A')) return 'MBA';
    if (clean.includes('BHM') || clean.includes('B.H.M')) return 'BHM';
    if (clean.includes('PHD') || clean.includes('PH.D')) return 'PHD';
    return clean || 'BTECH';
};

/**
 * Human-readable label for a normalized programme
 */
export const getProgrammeLabel = (progCode: unknown): string => {
    const norm = normalizeProgramme(progCode);
    switch (norm) {
        case 'INT_MCA': return 'Int. MCA';
        case 'MCA': return 'MCA';
        case 'BTECH': return 'B.Tech';
        case 'MTECH': return 'M.Tech';
        case 'MBA': return 'MBA';
        case 'BHM': return 'BHM';
        case 'PHD': return 'PhD';
        default: return 'B.Tech';
    }
};

/**
 * Centralized Canonical Normalization for Branch Codes
 * Maps any branch alias, department code, or timetable shortcode to standard canonical code:
 * CS, EC, EE, ME, CE, AD, CA, CC, ER, MCA, INT_MCA, MBA, BHM, PHD
 */
export const normalizeBranchCode = (branchInput: unknown): string => {
    if (!branchInput) return 'UNKNOWN';
    let clean = String(branchInput).toUpperCase().trim();
    clean = clean.replace(/\(.*\)/g, '').trim();

    // Strip common prefixes
    if (clean.startsWith('IT') && clean.length > 2 && !['INT', 'INT_MCA', 'INT MCA', 'INT. MCA'].includes(clean)) {
        const withoutIT = clean.slice(2);
        if (withoutIT.length >= 2) clean = withoutIT;
    }

    // Exact branch alias dictionary
    const canonicalMap: Record<string, string> = {
        'CS': 'CS',
        'CSE': 'CS',
        'CSEPGR': 'CS',
        'CSEWP': 'CS',
        'COMPUTER SCIENCE': 'CS',
        'COMPUTER SCIENCE & ENGINEERING': 'CS',
        'COMPUTER SCIENCE AND ENGINEERING': 'CS',

        'EC': 'EC',
        'ECE': 'EC',
        'ECEPGL': 'EC',
        'ECEWP': 'EC',
        'ELECTRONICS': 'EC',
        'ELECTRONICS & COMMUNICATION': 'EC',
        'ELECTRONICS & COMMUNICATION ENGINEERING': 'EC',
        'ELECTRONICS AND COMMUNICATION ENGINEERING': 'EC',

        'EE': 'EE',
        'EEE': 'EE',
        'EEEWP': 'EE',
        'ELECTRICAL': 'EE',
        'ELECTRICAL & ELECTRONICS': 'EE',
        'ELECTRICAL & ELECTRONICS ENGINEERING': 'EE',
        'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EE',

        'ME': 'ME',
        'MECH': 'ME',
        'MEWP': 'ME',
        'MEAMPM': 'ME',
        'MECHANICAL': 'ME',
        'MECHANICAL ENGINEERING': 'ME',

        'CE': 'CE',
        'CIVIL': 'CE',
        'CEWP': 'CE',
        'CIVIL ENGINEERING': 'CE',

        'AD': 'AD',
        'AIDS': 'AD',
        'AI&DS': 'AD',
        'AI_DS': 'AD',
        'ARTIFICIAL INTELLIGENCE': 'AD',
        'ARTIFICIAL INTELLIGENCE & DATA SCIENCE': 'AD',
        'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AD',

        'CA': 'CA',
        'CYBER APPLICATIONS': 'CA',

        'CC': 'CC',
        'CYBER SECURITY': 'CC',
        'CS CYBER SECURITY': 'CC',
        'COMPUTER SCIENCE (CYBER SECURITY)': 'CC',

        'ER': 'ER',
        'RA': 'ER',
        'ROBOTICS': 'ER',
        'ROBOTICS & AUTOMATION': 'ER',
        'ROBOTICS AND AUTOMATION': 'ER',
        'ELECTRONICS & ROBOTICS': 'ER',
        'ELECTRONICS AND ROBOTICS': 'ER',

        'MCA': 'MCA',
        'M.C.A': 'MCA',
        'MASTER OF COMPUTER APPLICATIONS': 'MCA',

        'INT_MCA': 'INT_MCA',
        'INT MCA': 'INT_MCA',
        'INT. MCA': 'INT_MCA',
        'INTEGRATED MCA': 'INT_MCA',
        'IMCA': 'INT_MCA',
        'INMCA': 'INT_MCA',

        'MBA': 'MBA',
        'M.B.A': 'MBA',
        'MANAGEMENT STUDIES': 'MBA',

        'BHM': 'BHM',
        'B.H.M': 'BHM',
        'HOTEL MANAGEMENT': 'BHM',

        'MTECH': 'MTECH',
        'M.TECH': 'MTECH',
        'MASTER OF TECHNOLOGY': 'MTECH',

        'PHD': 'PHD',
        'PH.D': 'PHD',
    };

    const matchedCanonical = canonicalMap[clean];
    if (matchedCanonical) return matchedCanonical;

    // Check partial containment for complex names (with strict ordering, INT MCA before MCA, NEVER substring matching CA!)
    if (clean.includes('INT MCA') || clean.includes('INT_MCA') || clean.includes('INTEGRATED MCA') || clean.includes('INMCA') || clean.includes('IMCA')) return 'INT_MCA';
    if (clean.includes('AI&DS') || clean.includes('AIDS') || clean.includes('ARTIFICIAL INTELLIGENCE')) return 'AD';
    if (clean.includes('CYBER SECURITY')) return 'CC';
    if (clean.includes('ROBOTICS')) return 'ER';
    if (clean.includes('COMPUTER SCIENCE') || clean.includes('CSE')) return 'CS';
    if (clean.includes('ELECTRONICS & COMMUNICATION') || clean.includes('ECE')) return 'EC';
    if (clean.includes('ELECTRICAL & ELECTRONICS') || clean.includes('EEE')) return 'EE';
    if (clean.includes('MECHANICAL') || clean.includes('MECH')) return 'ME';
    if (clean.includes('CIVIL')) return 'CE';
    if (clean.includes('MASTER OF COMPUTER APPLICATIONS') || clean === 'MCA' || clean.startsWith('MCA ') || clean.endsWith(' MCA')) return 'MCA';
    if (clean === 'CA' || clean.startsWith('CA ') || clean.endsWith(' CA')) return 'CA';

    const alphaOnly = clean.replace(/[^A-Z0-9]/g, '');
    return alphaOnly || 'UNKNOWN';
};

// Backwards compatibility alias
export const normalizeBranch = normalizeBranchCode;

export const normalizeProgram = (programCode: string): string => {
    if (!programCode) return "UNKNOWN";
    return normalizeBranchCode(programCode);
};

export const mapProgramToDepartment = (programCode: string): string => {
    const normalized = normalizeBranchCode(programCode);
    return PROGRAM_DEPARTMENT_MAP[normalized] || normalized;
};

export const getDepartmentCodeFromProgram = (programCode: string): string => {
    const normalized = normalizeBranchCode(programCode);
    const map: Record<string, string> = {
        "CS": "CSE",
        "EC": "ECE",
        "EE": "EEE",
        "ME": "ME",
        "CE": "CE",
        "AD": "AD",
        "CA": "CA",
        "CC": "CC",
        "ER": "ER",
        "MCA": "MCA",
        "INT_MCA": "INT_MCA",
        "MBA": "MBA",
        "BHM": "BHM",
        "MTECH": "MTECH",
        "PHD": "PHD"
    };
    return map[normalized] || normalized;
};

/**
 * Parses batch string (e.g. "Batch : CSE 2025-2029 A (S3)", "Batch : MCA 2025-27 (S3)", "Batch : INT MCA 2025-30 (S3)", "Batch : CA 2025-2029 (S3)")
 * and extracts a normalized academic identity.
 */
export const parseBatchString = (batchText: unknown): NormalizedAcademicInfo => {
    const text = String(batchText || '').trim();
    if (!text) {
        return {
            programCode: 'UNKNOWN',
            programmeLabel: 'Unknown',
            rawBranch: 'UNKNOWN',
            normalizedBranchCode: 'UNKNOWN',
            departmentCode: 'UNKNOWN',
            departmentName: 'Unknown Department',
            batchYear: null,
            batchEndYear: null,
            batchName: null,
            division: null,
            semester: null,
            semesterName: null
        };
    }

    // 1. Remove "Batch :" prefix if exists
    const cleanText = text.replace(/^Batch\s*:\s*/i, '').trim();

    // 2. Extract Semester (e.g. S3, S7, Sem 3, (S3), S-3, (S 3))
    let semester: number | null = null;
    const semMatch = 
        cleanText.match(/\(S\s*[-_]?\s*(\d+)\)/i) ||
        cleanText.match(/\bS\s*[-_]?\s*(\d+)\b/i) ||
        cleanText.match(/Sem(?:ester)?\s*[-_]?\s*(\d+)/i) ||
        cleanText.match(/\((\d+)\)/);
        
    if (semMatch && semMatch[1]) {
        semester = parseInt(semMatch[1], 10);
    }
    const semesterName = semester ? `S${semester}` : null;

    // 3. Extract Batch Years (e.g. 2025-2029, 2025-27, 2025-30, or single year 2025)
    let batchYear: number | null = null;
    let batchEndYear: number | null = null;
    const rangeMatch = cleanText.match(/(20\d{2})\s*[-–]\s*(20\d{2}|\d{2})/);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
        batchYear = parseInt(rangeMatch[1], 10);
        let endRaw = rangeMatch[2];
        if (endRaw.length === 2) endRaw = '20' + endRaw;
        batchEndYear = parseInt(endRaw, 10);
    } else {
        const yearMatch = cleanText.match(/(20\d{2})/);
        if (yearMatch && yearMatch[1]) {
            batchYear = parseInt(yearMatch[1], 10);
        }
    }

    // 4. Extract Branch text before years
    let textBeforeYears = cleanText;
    if (rangeMatch) {
        textBeforeYears = cleanText.substring(0, cleanText.indexOf(rangeMatch[0])).trim();
    } else if (cleanText.match(/20\d{2}/)) {
        const idx = cleanText.search(/20\d{2}/);
        textBeforeYears = cleanText.substring(0, idx).trim();
    }

    const rawBranch = textBeforeYears.toUpperCase().trim() || cleanText.split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN';

    // 5. Extract Division: ONLY if explicit section letter is specified after years or with Div/Section
    let division: string | null = null;
    let textAfterYears = '';
    if (rangeMatch) {
        textAfterYears = cleanText.substring(cleanText.indexOf(rangeMatch[0]) + rangeMatch[0].length).replace(/\(S\d+\)/gi, '').trim();
    }

    const divMatch = textAfterYears.match(/\b([A-E])\b/i) ||
                     cleanText.match(/(?:DIV|DIVISION|SEC|SECTION)\s*([A-E])/i);
    if (divMatch && divMatch[1]) {
        division = divMatch[1].toUpperCase();
    }

    // 6. Determine Programme & Normalized Branch
    let programmeCode = 'BTECH';
    let normalizedBranchCode = normalizeBranchCode(rawBranch);

    if (rawBranch.startsWith('PHD') || rawBranch.includes('PH.D') || rawBranch.includes('PHD')) {
        programmeCode = 'PHD';
        normalizedBranchCode = rawBranch.replace(/^PHD\s*/i, '').trim();
    } else if (rawBranch.includes('INT MCA') || rawBranch.includes('INT_MCA') || rawBranch.includes('INT. MCA') || rawBranch.includes('INMCA') || rawBranch.includes('IMCA')) {
        programmeCode = 'INT_MCA';
        normalizedBranchCode = 'INT_MCA';
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 5;
    } else if (rawBranch === 'MCA' || rawBranch === 'M.C.A' || rawBranch.includes('MASTER OF COMPUTER APPLICATIONS')) {
        programmeCode = 'MCA';
        normalizedBranchCode = 'MCA';
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 2;
    } else if (rawBranch === 'MBA' || rawBranch === 'M.B.A' || rawBranch.includes('MANAGEMENT STUDIES')) {
        programmeCode = 'MBA';
        normalizedBranchCode = 'MBA';
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 2;
    } else if (rawBranch.includes('PGR') || rawBranch.includes('PGL') || rawBranch.includes('AMPM') || rawBranch.startsWith('MTECH') || rawBranch.startsWith('M.TECH') || rawBranch.includes('M TECH')) {
        programmeCode = 'MTECH';
        normalizedBranchCode = rawBranch;
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 2;
    } else if (rawBranch === 'BHM' || rawBranch.includes('HOTEL MANAGEMENT')) {
        programmeCode = 'BHM';
        normalizedBranchCode = 'BHM';
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 3;
    } else if (rawBranch === 'CA') {
        programmeCode = 'BTECH';
        normalizedBranchCode = 'CA';
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 4;
    } else {
        programmeCode = 'BTECH';
        if (batchYear && !batchEndYear) batchEndYear = batchYear + 4;
    }

    const programmeLabel = getProgrammeLabel(programmeCode);
    const departmentCode = getDepartmentCodeFromProgram(normalizedBranchCode);
    const departmentName = PROGRAM_DEPARTMENT_MAP[normalizedBranchCode] || PROGRAM_DEPARTMENT_MAP[departmentCode] || `${departmentCode} Department`;

    // 7. Canonical batchName preserving division (e.g. "CSE 2025-2029 A", "CA 2025-2029", "MCA 2025-27", "INT MCA 2025-30")
    const cleanNoSem = cleanText.replace(/\s*\([S\d\s\-_]+\)/i, '').trim();
    const batchName = cleanNoSem || (batchYear 
        ? `${rawBranch} ${batchYear}${batchEndYear ? '-' + batchEndYear : ''}${division ? ' ' + division : ''}`
        : rawBranch);

    return {
        programCode: programmeCode,
        programmeLabel,
        rawBranch,
        normalizedBranchCode,
        departmentCode,
        departmentName,
        batchYear,
        batchEndYear,
        batchName,
        division,
        semester,
        semesterName
    };
};

export const resolveOrCreateProgram = async (programCode: string, t?: Transaction) => {
  const normProg = normalizeProgramme(programCode);
  const progLabel = getProgrammeLabel(normProg);
  const deptCode = getDepartmentCodeFromProgram(normProg);
  const deptName = PROGRAM_DEPARTMENT_MAP[normProg] || `${deptCode} Department`;
  
  const department = await resolveOrCreateDepartment(deptCode, deptName, t);

  let program = await Program.findOne({ 
    where: { 
      [Op.or]: [
        { ProgramCode: normProg },
        { ProgramName: progLabel }
      ]
    },
    transaction: t || null
  });
  
  if (!program) {
    const durationMap: Record<string, number> = {
        "MCA": 2, "MBA": 2, "INT_MCA": 5, "BHM": 3, "BTECH": 4, "MTECH": 2
    };
    const dur = durationMap[normProg] || 4;
    program = await Program.create({
      ProgramName: progLabel,
      ProgramCode: normProg,
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

export const resolveOrCreateDepartment = async (deptCodeRaw: string, deptNameRaw?: string, t?: Transaction) => {
  const normBranch = normalizeBranchCode(deptCodeRaw);
  const deptCode = getDepartmentCodeFromProgram(normBranch);
  const departmentName = deptNameRaw || PROGRAM_DEPARTMENT_MAP[normBranch] || `${deptCode} Department`;

  // 1. Find strictly by DepartmentCode first
  let department = await Department.findOne({
    where: { 
      [Op.or]: [
        { DepartmentCode: deptCode },
        { DepartmentCode: normBranch }
      ]
    },
    transaction: t || null
  });

  // 2. If not found by code, create it cleanly with its own distinct DepartmentCode
  if (!department) {
    department = await Department.create({
      DepartmentCode: deptCode,
      DepartmentName: departmentName,
      IsActive: true
    }, { transaction: t || null });
  }
  
  return department;
};

