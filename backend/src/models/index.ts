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
