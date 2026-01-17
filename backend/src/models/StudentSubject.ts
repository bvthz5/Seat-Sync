import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Student } from "./Student.js";
import { Subject } from "./Subject.js";

/**
 * StudentSubject table attributes
 */
interface StudentSubjectAttributes {
  StudentID: number;
  SubjectID: number;
}

export class StudentSubject extends Model<StudentSubjectAttributes>
  implements StudentSubjectAttributes {
  declare StudentID: number;
  declare SubjectID: number;
}

StudentSubject.init(
  {
    StudentID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Students",
        key: "StudentID",
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
    tableName: "StudentSubjects",
    timestamps: false,
  }
);

/**
 * Associations
 */
Student.belongsToMany(Subject, {
  through: StudentSubject,
  foreignKey: "StudentID",
  otherKey: "SubjectID",
});

Subject.belongsToMany(Student, {
  through: StudentSubject,
  foreignKey: "SubjectID",
  otherKey: "StudentID",
});

export default StudentSubject;