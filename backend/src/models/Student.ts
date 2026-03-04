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
  UserID: number | null;
  RegisterNumber: string;
  DepartmentID: number | null;
  ProgramID: number | null;
  SemesterID: number | null;
  BatchYear: number | null;
}

/**
 * Attributes required when creating a student
 */
interface StudentCreationAttributes extends Optional<StudentAttributes, "StudentID" | "UserID" | "DepartmentID" | "ProgramID" | "SemesterID" | "BatchYear"> { }

export class Student extends Model<StudentAttributes, StudentCreationAttributes>
  implements StudentAttributes {
  declare StudentID: number;
  declare UserID: number | null;
  declare RegisterNumber: string;
  declare DepartmentID: number | null;
  declare ProgramID: number | null;
  declare SemesterID: number | null;
  declare BatchYear: number | null;
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
      allowNull: true,
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
      allowNull: true,
      references: {
        model: "Departments",
        key: "DepartmentID",
      },
    },
    ProgramID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Programs",
        key: "ProgramID",
      },
    },
    SemesterID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Semesters",
        key: "SemesterID",
      },
    },
    BatchYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
  onDelete: 'CASCADE',
});

Student.belongsTo(Program, {
  foreignKey: "ProgramID",
});

Program.hasMany(Student, {
  foreignKey: "ProgramID",
  onDelete: 'CASCADE',
});

Student.belongsTo(Semester, {
  foreignKey: "SemesterID",
});

Semester.hasMany(Student, {
  foreignKey: "SemesterID",
  onDelete: 'CASCADE',
});

export default Student;