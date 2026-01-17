import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Subject } from "./Subject.js";

/**
 * Exam table attributes
 */
interface ExamAttributes {
  ExamID: number;
  SubjectID: number;
  ExamName: string;
  ExamDate: Date;
  Session: string;
  Duration: number;
  Status: string;
}

/**
 * Attributes required when creating an exam
 */
interface ExamCreationAttributes extends Optional<ExamAttributes, "ExamID"> {}

export class Exam extends Model<ExamAttributes, ExamCreationAttributes>
  implements ExamAttributes {
  declare ExamID: number;
  declare SubjectID: number;
  declare ExamName: string;
  declare ExamDate: Date;
  declare Session: string;
  declare Duration: number;
  declare Status: string;
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
  },
  {
    sequelize,
    tableName: "Exams",
    timestamps: false,
  }
);

/**
 * Associations
 */
Exam.belongsTo(Subject, {
  foreignKey: "SubjectID",
});

Subject.hasMany(Exam, {
  foreignKey: "SubjectID",
});

export default Exam;