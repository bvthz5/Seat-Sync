import cron from "node-cron";
import { Student } from "../models/Student.js";
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

      const programDurationYears = program.DurationYears || 3;
      const maxSems = program.TotalSemesters || 6;

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

// Run every month or automatically at startup to ensure consistent DB states
cron.schedule("0 0 1 * *", promoteStudents);
