import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";
import { Department } from "./Department.js";
import { Program } from "./Program.js";
import { Semester } from "./Semester.js";

/**
 * Student table attributes
 */
interface StudentAttributes {
  StudentID: number;
  UserID: number;
  RegisterNumber: string;
  DepartmentID: number;
  ProgramID: number;
  SemesterID: number;
  BatchYear: number;
}

/**
 * Attributes required when creating a student
 */
interface StudentCreationAttributes extends Optional<StudentAttributes, "StudentID"> {}

export class Student extends Model<StudentAttributes, StudentCreationAttributes>
  implements StudentAttributes {
  declare StudentID: number;
  declare UserID: number;
  declare RegisterNumber: string;
  declare DepartmentID: number;
  declare ProgramID: number;
  declare SemesterID: number;
  declare BatchYear: number;
}

Student.init(
  {
    StudentID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "Users",
        key: "UserID",
      },
    },
    RegisterNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    DepartmentID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Departments",
        key: "DepartmentID",
      },
    },
    ProgramID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Programs",
        key: "ProgramID",
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
    BatchYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "Students",
    timestamps: false,
  }
);

/**
 * Associations
 */
Student.belongsTo(User, {
  foreignKey: "UserID",
});

User.hasOne(Student, {
  foreignKey: "UserID",
});

Student.belongsTo(Department, {
  foreignKey: "DepartmentID",
});

Department.hasMany(Student, {
  foreignKey: "DepartmentID",
});

Student.belongsTo(Program, {
  foreignKey: "ProgramID",
});

Program.hasMany(Student, {
  foreignKey: "ProgramID",
});

Student.belongsTo(Semester, {
  foreignKey: "SemesterID",
});

Semester.hasMany(Student, {
  foreignKey: "SemesterID",
});

export default Student;