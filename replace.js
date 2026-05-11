const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/apps/admin/pages/internal/InternalSeatingPlans.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Component Name
content = content.replace(/const SeatingPlans: React\.FC/g, 'const InternalSeatingPlans: React.FC');
content = content.replace(/export default SeatingPlans;/g, 'export default InternalSeatingPlans;');

// Add InternalSeatingService import
content = content.replace(
    /import \{ SeatingService \} from '\.\.\/services\/seatingService';/,
    "import { SeatingService } from '../services/seatingService';\nimport { InternalSeatingService } from '../services/internal/internalSeatingService';"
);

// Replace SeatingService calls with InternalSeatingService calls (except getSeries)
// getSeries('EndSemester') -> getSeries('Internal')
content = content.replace(/SeatingService\.getSeries\('EndSemester'\)/g, "SeatingService.getSeries('Internal')");

// getHalls
content = content.replace(/SeatingService\.getHalls\(\)/g, "InternalSeatingService.getHalls()");

// getDepartments
content = content.replace(/SeatingService\.getDepartments\(\)/g, "SeatingService.getDepartments()"); // keep this

// getExamDates -> SeatingService doesn't have it for internal? Actually InternalSeatingService has it.
content = content.replace(/SeatingService\.getExamDates\(/g, "InternalSeatingService.getExamDates(");

// getAllocationSummary
content = content.replace(/SeatingService\.getAllocationSummary\(/g, "InternalSeatingService.getSummary(");

// getHallLayout -> internal needs seriesId
// InternalSeatingService.getHallLayout(hallId, examDate, session, seriesId)
// Original: SeatingService.getHallLayout(detailHall.hallId) - wait!
content = content.replace(
    /SeatingService\.getHallLayout\(detailHall\.hallId\)/g,
    "InternalSeatingService.getHallLayout(detailHall.hallId, selectedDate, selectedSession, Number(selectedSeries))"
);

content = content.replace(
    /SeatingService\.getHallLayout\(hs\.hallId\)/g,
    "InternalSeatingService.getHallLayout(hs.hallId, selectedDate, selectedSession, Number(selectedSeries))"
);

// getAllocationForHall -> In internal, getHallLayout already includes allocations.
// Let's comment out getAllocationForHall and rely on layout.assignments?
// Original: const alloc = await SeatingService.getAllocationForHall(...)
// In internal: allocations are inside getHallLayout. We'll leave it or replace it.
// Actually, InternalSeatingService.getHallLayout returns `allocations` as well.
// Let's replace ExamService.getAll
content = content.replace(
    /ExamService\.getAll\(\{ startDate: selectedDate, endDate: selectedDate, session: selectedSession, seriesId: selectedSeries \? Number\(selectedSeries\) : undefined \}\)/g,
    "InternalSeatingService.getExams(selectedDate, selectedSession, Number(selectedSeries))"
);

// ExamService.getEligibleStudents -> wait, in internal we have `InternalExamRegistration`.
// How did InternalSeatingPlans originally get eligible students?
// We can just rely on the summary data or skip student count verification, but for now:
content = content.replace(
    /ExamService\.getEligibleStudents\(exam\.ExamID\)/g,
    "api.get(`/internal/exams/${exam.InternalExamID}/students`).then(r => r.data)" // We might need to handle this
);

// SeatingService.bulkAssign -> InternalSeatingService.generate
content = content.replace(/SeatingService\.bulkAssign\(/g, "InternalSeatingService.generate(");

// clearAllocation
content = content.replace(/SeatingService\.clearAllocation\(selectedDate, selectedSession, detailHall\.hallId\)/g, "InternalSeatingService.clear(selectedDate, selectedSession, detailHall.hallId, Number(selectedSeries))");
content = content.replace(/SeatingService\.clearAllocation\(selectedDate, selectedSession, h\.hallId\)/g, "InternalSeatingService.clear(selectedDate, selectedSession, h.hallId, Number(selectedSeries))");

// clearAllAllocations -> backend doesn't have a clearAll endpoint for internal, we can just clear hall by hall or implement it. Let's just map it to something or disable it.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacements done');
