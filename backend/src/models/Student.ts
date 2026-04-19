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
  FullName: string;
  DepartmentID: number;
  ProgramID: number;
  SemesterID: number;
  BatchYear: number;
  Status: "ACTIVE" | "GRADUATED" | "DROPPED";
  AdmissionDate: Date | null;
}

/**
 * Attributes required when creating a student
 */
interface StudentCreationAttributes extends Optional<StudentAttributes, "StudentID" | "UserID" | "Status" | "AdmissionDate" | "DepartmentID" | "ProgramID" | "SemesterID" | "BatchYear" | "FullName"> {}

export class Student extends Model<StudentAttributes, StudentCreationAttributes>
  implements StudentAttributes {
  declare StudentID: number;
  declare UserID: number | null;
  declare RegisterNumber: string;
  declare FullName: string;
  declare DepartmentID: number;
  declare ProgramID: number;
  declare SemesterID: number;
  declare BatchYear: number;
  declare Status: "ACTIVE" | "GRADUATED" | "DROPPED";
  declare AdmissionDate: Date | null;
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
    FullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
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
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ACTIVE",
      validate: {
        isIn: [['ACTIVE', 'GRADUATED', 'DROPPED']]
      }
    },
    AdmissionDate: {
      type: DataTypes.DATE,
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