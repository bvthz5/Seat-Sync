import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Subject } from "./Subject.js";

/**
 * Exam table attributes
 */
interface ExamAttributes {
  ExamID: number;
  SubjectID: number;
  ExamSeriesID?: number;
  ExamName: string;
  ExamDate: Date;
  Session: string;
  Duration: number;
  Status: string;
  AuditStatus?: 'Clean' | 'Conflict' | 'Pending';
  ConflictDetails?: string;
  IsEmergencyMode: boolean;
  AttendanceLocked: boolean;
}

/**
 * Attributes required when creating an exam
 */
interface ExamCreationAttributes extends Optional<ExamAttributes, "ExamID"> { }

export class Exam extends Model<ExamAttributes, ExamCreationAttributes>
  implements ExamAttributes {
  declare ExamID: number;
  declare SubjectID: number;
  declare ExamSeriesID?: number;
  declare ExamName: string;
  declare ExamDate: Date;
  declare Session: string;
  declare Duration: number;
  declare Status: string;
  declare IsEmergencyMode: boolean;
  declare AttendanceLocked: boolean;
}

Exam.init(
  {
    ExamID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    SubjectID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Subjects",
        key: "SubjectID",
      },
    },
    ExamSeriesID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "ExamSeries",
        key: "ExamSeriesID",
      },
    },
    ExamName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    ExamDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    Session: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    Duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    AuditStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: 'Pending'
    },
    ConflictDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IsEmergencyMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    AttendanceLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  },
  {
    sequelize,
    tableName: "Exams",
    timestamps: false,
    indexes: [
      {
        fields: ["ExamDate"], // Optmize query for exams on a specific date
      },
      {
        fields: ["ExamSeriesID"],
      },
    ],
  }
);

import { ExamSeries } from "./ExamSeries.js";

/**
 * Associations
 */
Exam.belongsTo(Subject, {
  foreignKey: "SubjectID",
});

Subject.hasMany(Exam, {
  foreignKey: "SubjectID",
});

Exam.belongsTo(ExamSeries, {
  foreignKey: "ExamSeriesID",
});

ExamSeries.hasMany(Exam, {
  foreignKey: "ExamSeriesID",
});

export default Exam;