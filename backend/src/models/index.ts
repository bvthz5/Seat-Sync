export { default as User } from "./User.js";
export { default as UserProfile } from "./UserProfile.js";
export { default as Department } from "./Department.js";
export { default as Program } from "./Program.js";
export { default as Semester } from "./Semester.js";
export { default as Student } from "./Student.js";
export { default as Subject } from "./Subject.js";
export { default as StudentSubject } from "./StudentSubject.js";
export { default as Exam } from "./Exam.js";
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

// Associations
import Department from "./Department.js";
import Faculty from "./Faculty.js";
import Invigilator from "./Invigilator.js";
import User from "./User.js";
import Exam from "./Exam.js";
import InvigilatorAssignment from "./InvigilatorAssignment.js";
import Room from "./Room.js";

// Define associations here to avoid circular imports in model files
Department.hasMany(Faculty, {
    foreignKey: "DepartmentID",
    as: "Faculties"
});

Faculty.belongsTo(Department, {
    foreignKey: "DepartmentID"
});

// Department-Invigilator Association
Department.hasMany(Invigilator, {
    foreignKey: "DepartmentID",
});

Invigilator.belongsTo(Department, {
    foreignKey: "DepartmentID",
});

// Invigilator Associations
Invigilator.belongsTo(User, {
    foreignKey: "UserID",
});

User.hasOne(Invigilator, {
    foreignKey: "UserID",
});

// InvigilatorAssignment Associations
InvigilatorAssignment.belongsTo(Invigilator, {
    foreignKey: "InvigilatorID",
});

Invigilator.hasMany(InvigilatorAssignment, {
    foreignKey: "InvigilatorID",
});

InvigilatorAssignment.belongsTo(Exam, {
    foreignKey: "ExamID",
});

Exam.hasMany(InvigilatorAssignment, {
    foreignKey: "ExamID",
});

InvigilatorAssignment.belongsTo(Room, {
    foreignKey: "RoomID"
});

Room.hasMany(InvigilatorAssignment, {
    foreignKey: "RoomID"
});

