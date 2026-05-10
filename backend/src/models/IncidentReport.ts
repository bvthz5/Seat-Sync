import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

interface IncidentReportAttributes {
  ReportID: number;
  ExamID: number;
  RoomID: number;
  FacultyID: number;
  Type: "Malpractice" | "Discipline" | "Medical" | "Infrastructure" | "Other";
  Description: string;
  Status: "PENDING" | "RESOLVED" | "FLAGGED";
  CreatedAt: Date;
}

interface IncidentReportCreationAttributes extends Optional<IncidentReportAttributes, "ReportID" | "Status" | "CreatedAt"> { }

export class IncidentReport extends Model<IncidentReportAttributes, IncidentReportCreationAttributes> implements IncidentReportAttributes {
  declare ReportID: number;
  declare ExamID: number;
  declare RoomID: number;
  declare FacultyID: number;
  declare Type: "Malpractice" | "Discipline" | "Medical" | "Infrastructure" | "Other";
  declare Description: string;
  declare Status: "PENDING" | "RESOLVED" | "FLAGGED";
  declare CreatedAt: Date;
}

IncidentReport.init(
  {
    ReportID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ExamID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    RoomID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    FacultyID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING",
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('GETDATE()'),
    },
  },
  {
    sequelize,
    tableName: "IncidentReports",
    timestamps: false,
  }
);

export default IncidentReport;
