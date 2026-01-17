import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Exam } from "./Exam.js";
import { Student } from "./Student.js";

/**
 * ExamRegistration table attributes
 */
interface ExamRegistrationAttributes {
  ExamID: number;
  StudentID: number;
}

export class ExamRegistration extends Model<ExamRegistrationAttributes>
  implements ExamRegistrationAttributes {
  declare ExamID: number;
  declare StudentID: number;
}

ExamRegistration.init(
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
  },
  {
    sequelize,
    tableName: "ExamRegistrations",
    timestamps: false,
  }
);

/**
 * Associations
 */
Exam.belongsToMany(Student, {
  through: ExamRegistration,
  foreignKey: "ExamID",
  otherKey: "StudentID",
});

Student.belongsToMany(Exam, {
  through: ExamRegistration,
  foreignKey: "StudentID",
  otherKey: "ExamID",
});

export default ExamRegistration;