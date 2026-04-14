import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

interface ExamScheduleAttributes {
  ExamScheduleID: number;
  ExamDate: Date;
  Slot: string;
  SubjectCode: string;
}

interface ExamScheduleCreationAttributes
  extends Optional<ExamScheduleAttributes, "ExamScheduleID"> {}

export class ExamSchedule
  extends Model<ExamScheduleAttributes, ExamScheduleCreationAttributes>
  implements ExamScheduleAttributes
{
  declare ExamScheduleID: number;
  declare ExamDate: Date;
  declare Slot: string;
  declare SubjectCode: string;
}

ExamSchedule.init(
  {
    ExamScheduleID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ExamDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    Slot: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    SubjectCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "ExamSchedules",
    timestamps: false,
    indexes: [
      { fields: ["ExamDate", "Slot"] },
      { fields: ["SubjectCode"] },
    ],
  }
);

export default ExamSchedule;
