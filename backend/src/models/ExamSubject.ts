import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Exam } from "./Exam.js";
import { Subject } from "./Subject.js";

interface ExamSubjectAttributes {
  ExamID: number;
  SubjectID: number;
}

export class ExamSubject extends Model<ExamSubjectAttributes>
  implements ExamSubjectAttributes {
  declare ExamID: number;
  declare SubjectID: number;
}

ExamSubject.init(
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
    SubjectID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Subjects",
        key: "SubjectID",
      },
    },
  },
  {
    sequelize,
    tableName: "ExamSubjects",
    timestamps: false,
  }
);

Exam.belongsToMany(Subject, {
  through: ExamSubject,
  as: "MappedSubjects",
  foreignKey: "ExamID",
  otherKey: "SubjectID",
});

Subject.belongsToMany(Exam, {
  through: ExamSubject,
  as: "MappedExams",
  foreignKey: "SubjectID",
  otherKey: "ExamID",
});

export default ExamSubject;
