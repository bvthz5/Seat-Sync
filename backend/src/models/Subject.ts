import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Department } from "./Department.js";
import { Semester } from "./Semester.js";

/**
 * Subject table attributes
 */
interface SubjectAttributes {
  SubjectID: number;
  SubjectCode: string;
  SubjectName: string;
  DepartmentID: number;
  SemesterID: number;
}

/**
 * Attributes required when creating a subject
 */
interface SubjectCreationAttributes extends Optional<SubjectAttributes, "SubjectID"> {}

export class Subject extends Model<SubjectAttributes, SubjectCreationAttributes>
  implements SubjectAttributes {
  declare SubjectID: number;
  declare SubjectCode: string;
  declare SubjectName: string;
  declare DepartmentID: number;
  declare SemesterID: number;
}

Subject.init(
  {
    SubjectID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    SubjectCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    SubjectName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    DepartmentID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Departments",
        key: "DepartmentID",
      },
    },
    SemesterID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Semesters",
        key: "SemesterID",
      },
    },
  },
  {
    sequelize,
    tableName: "Subjects",
    timestamps: false,
  }
);

/**
 * Associations
 */
Subject.belongsTo(Department, {
  foreignKey: "DepartmentID",
});

Department.hasMany(Subject, {
  foreignKey: "DepartmentID",
});

Subject.belongsTo(Semester, {
  foreignKey: "SemesterID",
});

Semester.hasMany(Subject, {
  foreignKey: "SemesterID",
});

export default Subject;