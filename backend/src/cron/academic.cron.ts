import cron from "node-cron";
import { Student } from "../models/Student.js";
import { Semester } from "../models/Semester.js";
import { Op } from "sequelize";

export async function promoteStudents() {
  console.log("[CRON] Starting Student Promotion Job...");
  try {
    const students = await Student.findAll({ where: { Status: 'ACTIVE' } });

    // Fetch max semesters for each program to determine graduation
    const semesters = await Semester.findAll();
    const programMaxSemesters: Record<number, number> = {};
    
    // Determine highest SemesterID or SemesterNumber per program
    semesters.forEach(s => {
      const pid = s.ProgramID;
      // Depending on your Semester numbering, we compare SemesterNumber to find max
      // If your SemesterID is sequential and ordered, we could compare that. The prompt assumes SemesterID increments.
      if (!programMaxSemesters[pid] || (s.SemesterNumber && s.SemesterNumber > programMaxSemesters[pid])) {
        programMaxSemesters[pid] = s.SemesterNumber || s.SemesterID;
      }
    });

    for (let s of students) {
      const currentSem = semesters.find(sem => sem.SemesterID === s.SemesterID);
      const pid = s.ProgramID;

      if (!currentSem) continue;

      const maxSemNum = programMaxSemesters[pid];

      if (maxSemNum && currentSem.SemesterNumber && currentSem.SemesterNumber < maxSemNum) {
        // Find next semester for the program
        const nextSem = semesters.find(sem => sem.ProgramID === pid && sem.SemesterNumber === currentSem.SemesterNumber! + 1);
        if (nextSem) {
          s.SemesterID = nextSem.SemesterID;
        } else {
            // Fallback: If no matching next semester by number, manually increment ID safely if possible
            s.SemesterID += 1;
        }
      } else if (maxSemNum && currentSem.SemesterNumber && currentSem.SemesterNumber >= maxSemNum) {
        s.Status = "GRADUATED";
      }
      await s.save();
    }
    console.log("[CRON] Student Promotion Job Finished Successfully.");
  } catch (error) {
    console.error("[CRON] Error during Student Promotion:", error);
  }
}

// Run every 6 months (1st of Jan & Jul)
cron.schedule("0 0 1 JAN,JUL *", promoteStudents);
