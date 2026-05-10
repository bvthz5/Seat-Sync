export { default as User } from "./User.js";
export { default as UserProfile } from "./UserProfile.js";
export { default as Department } from "./Department.js";
export { default as Program } from "./Program.js";
export { default as Semester } from "./Semester.js";
export { default as Student } from "./Student.js";
export { default as Subject } from "./Subject.js";
export { default as StudentSubject } from "./StudentSubject.js";
export { default as Exam } from "./Exam.js";
export { default as ExamSubject } from "./ExamSubject.js";
export { default as ExamSchedule } from "./ExamSchedule.js";
export { default as ExamRegistration } from "./ExamRegistration.js";
export { default as Block } from "./Block.js";
export { default as Floor } from "./Floor.js";
export { default as Room } from "./Room.js";
export { default as Seat } from "./Seat.js";
export { default as SeatAllocation } from "./SeatAllocation.js";
export { default as Invigilator } from "./Invigilator.js";
export { default as InvigilatorSubject } from "./InvigilatorSubject.js";
export { default as InvigilatorAvailability } from "./InvigilatorAvailability.js";
export { default as InvigilatorAssignment } from "./InvigilatorAssignment.js";
export { default as Attendance } from "./Attendance.js";
export { default as ActivityLog } from "./ActivityLog.js";
export { default as PasswordReset } from "./PasswordReset.model.js";
export { default as AcademicYear } from "./AcademicYear.js";
export { default as Notification } from "./Notification.js";
export { default as ActiveSession } from "./ActiveSession.js";
export { default as Faculty } from "./Faculty.js";
export { default as ExamSeries } from "./ExamSeries.js";
export { default as Zone } from "./Zone.js";
export { default as InvigilatorRequest } from "./InvigilatorRequest.js";
export { default as ProgramDepartment } from "./ProgramDepartment.js";
export { default as IncidentReport } from "./IncidentReport.js";
export { default as DutySwap } from "./DutySwap.js";

// Associations
import ActivityLog from "./ActivityLog.js";
import Department from "./Department.js";
import Faculty from "./Faculty.js";
import Invigilator from "./Invigilator.js";
import User from "./User.js";
import Exam from "./Exam.js";
import InvigilatorAssignment from "./InvigilatorAssignment.js";
import Room from "./Room.js";
import Program from "./Program.js";
import ProgramDepartment from "./ProgramDepartment.js";

// Define associations here to avoid circular imports in model files
ActivityLog.belongsTo(User, {
    foreignKey: "UserID",
});

User.hasMany(ActivityLog, {
    foreignKey: "UserID",
});



// Department-Invigilator Association
Department.hasMany(Invigilator, {
    foreignKey: "DepartmentID",
    onDelete: 'CASCADE'
});

Invigilator.belongsTo(Department, {
    foreignKey: "DepartmentID",
});

// Department-Program Association (legacy single FK kept for backward compat)
Department.hasMany(Program, {
    foreignKey: "DepartmentID",
    as: "Programs",
    onDelete: 'NO ACTION'
});

Program.belongsTo(Department, {
    foreignKey: "DepartmentID",
    as: "Department",
    onDelete: 'NO ACTION'
});

Program.belongsToMany(Department, {
    through: ProgramDepartment,
    foreignKey: "ProgramID",
    otherKey: "DepartmentID",
    as: "Departments",
    onDelete: 'NO ACTION'
});

Department.belongsToMany(Program, {
    through: ProgramDepartment,
    foreignKey: "DepartmentID",
    otherKey: "ProgramID",
    as: "LinkedPrograms",
    onDelete: 'NO ACTION'
});

// Invigilator Associations
Invigilator.belongsTo(User, {
    foreignKey: "UserID",
});

User.hasOne(Invigilator, {
    foreignKey: "UserID",
});

// Notification Associations
import { Notification } from "./Notification.js";
import { NotificationRecipient } from "./NotificationRecipient.js";

export { default as NotificationRecipient } from "./NotificationRecipient.js";

Notification.hasMany(NotificationRecipient, {
    foreignKey: "NotificationID",
    as: "Recipients",
    onDelete: "CASCADE"
});

NotificationRecipient.belongsTo(Notification, {
    foreignKey: "NotificationID",
    as: "Notification"
});

User.hasMany(NotificationRecipient, {
    foreignKey: "UserID",
    as: "Notifications"
});

NotificationRecipient.belongsTo(User, {
    foreignKey: "UserID",
    as: "User"
});

import { InternalExamSeries } from './InternalExamSeries.js';
import { InternalExam } from './InternalExam.js';
import { InternalExamDepartment } from './InternalExamDepartment.js';
import InternalBlock from './InternalBlock.js';
import InternalFloor from './InternalFloor.js';
import InternalRoom from './InternalRoom.js';
import InternalSeat from './InternalSeat.js';
import ExamSeries from './ExamSeries.js';

export { 
    InternalExamSeries, 
    InternalExam, 
    InternalExamDepartment, 
    InternalBlock, 
    InternalFloor, 
    InternalRoom, 
    InternalSeat 
};

// Internal Exam Associations
ExamSeries.hasMany(InternalExam, { foreignKey: 'InternalExamSeriesID', onDelete: 'CASCADE' });
InternalExam.belongsTo(ExamSeries, { foreignKey: 'InternalExamSeriesID' });

InternalExam.hasMany(InternalExamDepartment, { foreignKey: 'InternalExamID', onDelete: 'CASCADE' });
InternalExamDepartment.belongsTo(InternalExam, { foreignKey: 'InternalExamID' });

Department.hasMany(InternalExamDepartment, { foreignKey: 'DepartmentID', onDelete: 'CASCADE' });
InternalExamDepartment.belongsTo(Department, { foreignKey: 'DepartmentID' });

// ═══════════════════════════════════════════════════════════════
// INTERNAL STUDENT ECOSYSTEM — Completely isolated from EndSem
// ═══════════════════════════════════════════════════════════════
import InternalStudent from './InternalStudent.js';
import InternalExamRegistration from './InternalExamRegistration.js';
import InternalSeatAllocation from './InternalSeatAllocation.js';
import { InternalSeatSnapshot } from './InternalSeatSnapshot.js';

export { 
    InternalStudent, 
    InternalExamRegistration, 
    InternalSeatAllocation,
    InternalSeatSnapshot
};
import Semester from './Semester.js';

// InternalStudent ↔ User (shared auth layer)
InternalStudent.belongsTo(User, { foreignKey: 'UserID', onDelete: 'NO ACTION' });
User.hasOne(InternalStudent, { foreignKey: 'UserID' });

// InternalStudent ↔ Department
InternalStudent.belongsTo(Department, { foreignKey: 'DepartmentID', onDelete: 'NO ACTION' });
Department.hasMany(InternalStudent, { foreignKey: 'DepartmentID', onDelete: 'NO ACTION' });

// InternalStudent ↔ Program
InternalStudent.belongsTo(Program, { foreignKey: 'ProgramID', onDelete: 'NO ACTION' });
Program.hasMany(InternalStudent, { foreignKey: 'ProgramID', onDelete: 'NO ACTION' });

// InternalStudent ↔ Semester
InternalStudent.belongsTo(Semester, { foreignKey: 'SemesterID', onDelete: 'NO ACTION' });
Semester.hasMany(InternalStudent, { foreignKey: 'SemesterID', onDelete: 'NO ACTION' });

// InternalExamRegistration ↔ InternalExam (mapping: student appears for this exam)
InternalExamRegistration.belongsTo(InternalExam, { foreignKey: 'InternalExamID', onDelete: 'CASCADE' });
InternalExam.hasMany(InternalExamRegistration, { foreignKey: 'InternalExamID', onDelete: 'CASCADE' });

// InternalExamRegistration ↔ InternalStudent
InternalExamRegistration.belongsTo(InternalStudent, { foreignKey: 'InternalStudentID', onDelete: 'CASCADE' });
InternalStudent.hasMany(InternalExamRegistration, { foreignKey: 'InternalStudentID', onDelete: 'CASCADE' });

// InternalSeatAllocation associations
InternalSeatAllocation.belongsTo(InternalExam, { foreignKey: 'InternalExamID', as: 'Exam', onDelete: 'CASCADE' });
InternalExam.hasMany(InternalSeatAllocation, { foreignKey: 'InternalExamID', as: 'Allocations', onDelete: 'CASCADE' });

InternalSeatAllocation.belongsTo(InternalSeat, { foreignKey: 'InternalSeatID', as: 'Seat', onDelete: 'CASCADE' });
InternalSeat.hasMany(InternalSeatAllocation, { foreignKey: 'InternalSeatID', as: 'Allocations', onDelete: 'CASCADE' });

InternalSeatAllocation.belongsTo(InternalStudent, { foreignKey: 'InternalStudentID', as: 'Student', onDelete: 'CASCADE' });
InternalStudent.hasMany(InternalSeatAllocation, { foreignKey: 'InternalStudentID', as: 'Allocations', onDelete: 'CASCADE' });

// InternalSeatSnapshot Associations
InternalSeatSnapshot.belongsTo(InternalExamSeries, { foreignKey: 'SeriesID', as: 'Series', onDelete: 'CASCADE' });
InternalExamSeries.hasMany(InternalSeatSnapshot, { foreignKey: 'SeriesID', as: 'Snapshots', onDelete: 'CASCADE' });

InternalSeatAllocation.belongsTo(InternalSeatSnapshot, { foreignKey: 'SnapshotID', as: 'Snapshot', onDelete: 'SET NULL' });
InternalSeatSnapshot.hasMany(InternalSeatAllocation, { foreignKey: 'SnapshotID', as: 'Allocations', onDelete: 'CASCADE' });

// Internal Structure Associations (already defined in model files, but ensuring consistency here)
InternalBlock.hasMany(InternalFloor, { foreignKey: 'BlockID', as: 'Floors', onDelete: 'CASCADE' });
InternalFloor.belongsTo(InternalBlock, { foreignKey: 'BlockID', as: 'Block' });

InternalFloor.hasMany(InternalRoom, { foreignKey: 'FloorID', as: 'Rooms', onDelete: 'CASCADE' });
InternalRoom.belongsTo(InternalFloor, { foreignKey: 'FloorID', as: 'Floor' });

InternalBlock.hasMany(InternalRoom, { foreignKey: 'BlockID', as: 'Rooms', onDelete: 'CASCADE' });
InternalRoom.belongsTo(InternalBlock, { foreignKey: 'BlockID', as: 'Block' });

InternalRoom.hasMany(InternalSeat, { foreignKey: 'RoomID', onDelete: 'CASCADE' });
InternalSeat.belongsTo(InternalRoom, { foreignKey: 'RoomID' });

// Incident & Swap Associations
import IncidentReport from "./IncidentReport.js";
import DutySwap from "./DutySwap.js";

IncidentReport.belongsTo(Exam, { foreignKey: 'ExamID' });
IncidentReport.belongsTo(Room, { foreignKey: 'RoomID' });
IncidentReport.belongsTo(Faculty, { foreignKey: 'FacultyID' });

DutySwap.belongsTo(Exam, { foreignKey: 'ExamID' });
DutySwap.belongsTo(Room, { foreignKey: 'RoomID' });
DutySwap.belongsTo(Faculty, { as: 'Requester', foreignKey: 'RequesterID' });
DutySwap.belongsTo(Faculty, { as: 'Substitute', foreignKey: 'SubstituteID' });

Exam.hasMany(IncidentReport, { foreignKey: 'ExamID' });
Faculty.hasMany(IncidentReport, { foreignKey: 'FacultyID' });
Faculty.hasMany(DutySwap, { as: 'RequestedSwaps', foreignKey: 'RequesterID' });
Faculty.hasMany(DutySwap, { as: 'SubstituteSwaps', foreignKey: 'SubstituteID' });
