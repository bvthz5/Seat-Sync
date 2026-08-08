import cron from "node-cron";
import { Student } from "../models/Student.js";
import { InternalStudent } from "../models/InternalStudent.js";
import { Semester } from "../models/Semester.js";
import { Program } from "../models/Program.js";
import { Op } from "sequelize";

export async function promoteStudents() {
  console.log("[CRON] Starting Absolute Student Promotion/Sync Job...");
  try {
    const students = await Student.findAll({ where: { Status: 'ACTIVE' } });
    const semesters = await Semester.findAll();
    const programs = await Program.findAll();
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed (Jan=0, Jun=5, Dec=11)

    let updatedCount = 0;
    let graduatedCount = 0;

    for (let s of students) {
      if (!s.BatchYear || !s.ProgramID) continue;
      
      const program = programs.find(p => p.ProgramID === s.ProgramID);
      if (!program) continue;

      // Determine duration and max semesters perfectly
      let maxSems = program.TotalSemesters || 6;
      let programDurationYears = program.DurationYears || Math.ceil(maxSems / 2) || 3;
      
      // Intelligent fallback for common programs if metadata is missing
      const pName = (program.ProgramName || "").toUpperCase();
      if (!program.DurationYears) {
          if (pName.includes("B.TECH") || pName.includes("ENGINEERING") || pName.includes("B.PHARM")) {
              programDurationYears = 4;
              maxSems = 8;
          } else if (pName.includes("MCA") || pName.includes("M.TECH") || pName.includes("MBA")) {
              programDurationYears = 2; 
              maxSems = 4;
          } else if (pName.includes("B.ARCH")) {
              programDurationYears = 5;
              maxSems = 10;
          }
      }

      const monthAdjustment = currentMonth >= 6 ? 0 : -1;
      const academicYearsCompleted = (currentYear - s.BatchYear) + monthAdjustment;

      let calcSem = 1;
      let shouldGraduate = false;

      if (academicYearsCompleted < 0) {
          calcSem = 1;
      } else if (academicYearsCompleted >= programDurationYears) {
          calcSem = maxSems;
          shouldGraduate = true;
      } else {
          const firstSemOfCurrentYear = (academicYearsCompleted * 2) + 1;
          const semesterOfYear = currentMonth >= 6 ? 1 : 2;
          calcSem = Math.min(firstSemOfCurrentYear + (semesterOfYear - 1), maxSems);
      }

      calcSem = Math.min(Math.max(calcSem, 1), maxSems);

      // Find the specific Semester object
      let targetSem = semesters.find(sem => sem.ProgramID === s.ProgramID && sem.SemesterNumber === calcSem);
      
      // If the dynamic semester calculation requires an update
      let changed = false;
      if (targetSem && s.SemesterID !== targetSem.SemesterID) {
          s.SemesterID = targetSem.SemesterID;
          changed = true;
          updatedCount++;
      }

      if (shouldGraduate && s.Status !== "GRADUATED") {
          s.Status = "GRADUATED";
          changed = true;
          graduatedCount++;
      }

      if (changed) {
          await s.save();
      }
    }
    console.log(`[CRON] Student Sync Finished. Updated ${updatedCount} semesters, graduated ${graduatedCount} students.`);
  } catch (error) {
    console.error("[CRON] Error during Student Promotion:", error);
  }
}

export async function promoteInternalStudents() {
  console.log("[CRON] Starting Internal Student Promotion/Sync Job...");
  try {
    // Include GRADUATED students in re-evaluation to fix previously miscalculated graduations
    const students = await InternalStudent.findAll({ 
        where: { 
            Status: { [Op.in]: ['ACTIVE', 'GRADUATED'] } 
        } 
    });
    const semesters = await Semester.findAll();
    const programs = await Program.findAll();
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // Jan=0, Jul=6

    let updatedCount = 0;

    for (let s of students) {
      if (!s.BatchYear || !s.ProgramID) continue;
      
      const program = programs.find(p => p.ProgramID === s.ProgramID);
      if (!program) continue;

      // Determine duration and max semesters perfectly
      let maxSems = program.TotalSemesters || 6;
      let programDurationYears = program.DurationYears || Math.ceil(maxSems / 2) || 3;
      
      // Intelligent fallback for common programs if metadata is missing
      const pName = (program.ProgramName || "").toUpperCase();
      if (!program.DurationYears) {
          if (pName.includes("B.TECH") || pName.includes("ENGINEERING") || pName.includes("B.PHARM")) {
              programDurationYears = 4;
              maxSems = 8;
          } else if (pName.includes("MCA") || pName.includes("M.TECH") || pName.includes("MBA")) {
              programDurationYears = 2; 
              maxSems = 4;
          } else if (pName.includes("B.ARCH")) {
              programDurationYears = 5;
              maxSems = 10;
          }
      }

      // July (Month 6) is the transition month as requested
      const monthAdjustment = currentMonth >= 7 ? 0 : -1;
      const academicYearsCompleted = (currentYear - s.BatchYear) + monthAdjustment;

      let calcSem = 1;
      let shouldGraduate = false;

      if (academicYearsCompleted < 0) {
          calcSem = 1;
      } else if (academicYearsCompleted >= programDurationYears) {
          calcSem = maxSems;
          shouldGraduate = true;
      } else {
          const firstSemOfCurrentYear = (academicYearsCompleted * 2) + 1;
          const semesterOfYear = currentMonth >= 7 ? 1 : 2;
          calcSem = Math.min(firstSemOfCurrentYear + (semesterOfYear - 1), maxSems);
      }

      calcSem = Math.min(Math.max(calcSem, 1), maxSems);
      let targetSem = semesters.find(sem => sem.ProgramID === s.ProgramID && sem.SemesterNumber === calcSem);
      
      let changed = false;
      if (targetSem && s.SemesterID !== targetSem.SemesterID) {
          s.SemesterID = targetSem.SemesterID;
          changed = true;
          updatedCount++;
      }

      // Smart Status Logic: Re-activate if duration not yet met
      if (shouldGraduate && s.Status !== "GRADUATED") {
          s.Status = "GRADUATED";
          changed = true;
      } else if (!shouldGraduate && s.Status === "GRADUATED") {
          s.Status = "ACTIVE";
          changed = true;
      }

      if (changed) {
          await s.save();
      }
    }
    console.log(`[CRON] Internal Student Sync Finished. Updated ${updatedCount} semesters.`);
    return updatedCount;
  } catch (error) {
    console.error("[CRON] Error during Internal Student Promotion:", error);
    throw error;
  }
}

// Run every month or automatically at startup to ensure consistent DB states
cron.schedule("0 0 1 * *", promoteStudents);
