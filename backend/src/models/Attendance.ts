import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Exam } from "./Exam.js";
import { Student } from "./Student.js";
import { Invigilator } from "./Invigilator.js";

/**
 * Attendance table attributes
 */
interface AttendanceAttributes {
  ExamID: number;
  StudentID: number;
  IsPresent: boolean;
  MarkedByInvigilatorID?: number;
  MarkedAt?: Date;
}

export class Attendance extends Model<AttendanceAttributes>
  implements AttendanceAttributes {
  declare ExamID: number;
  declare StudentID: number;
  declare IsPresent: boolean;
  declare MarkedByInvigilatorID?: number;
  declare MarkedAt?: Date;
}

Attendance.init(
  {
    ExamID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Exams",
        key: "ExamID",
      },
    },
    StudentID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Students",
        key: "StudentID",
      },
    },
    IsPresent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    MarkedByInvigilatorID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Invigilators",
        key: "InvigilatorID",
      },
    },
    MarkedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "Attendance",
    timestamps: false,
  }
);

/**
 * Associations
 */
Attendance.belongsTo(Exam, {
  foreignKey: "ExamID",
});

Exam.hasMany(Attendance, {
  foreignKey: "ExamID",
});

Attendance.belongsTo(Student, {
  foreignKey: "StudentID",
});

Student.hasMany(Attendance, {
  foreignKey: "StudentID",
});

Attendance.belongsTo(Invigilator, {
  foreignKey: "MarkedByInvigilatorID",
  as: "MarkedByInvigilator",
});

Invigilator.hasMany(Attendance, {
  foreignKey: "MarkedByInvigilatorID",
  as: "MarkedAttendances",
});

export default Attendance;