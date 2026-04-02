import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Program table attributes
 */
interface ProgramAttributes {
  ProgramID: number;
  ProgramName: string;
  ProgramCode?: string;
  DurationYears?: number;
  TotalSemesters?: number;
  DepartmentID?: number;
  AcademicYearID?: number;
  IsActive?: boolean;
}

/**
 * Attributes required when creating a program
 */
interface ProgramCreationAttributes extends Optional<ProgramAttributes, "ProgramID"> { }

export class Program extends Model<ProgramAttributes, ProgramCreationAttributes>
  implements ProgramAttributes {
  declare ProgramID: number;
  declare ProgramName: string;
  declare ProgramCode?: string;
  declare DurationYears?: number;
  declare TotalSemesters?: number;
  declare DepartmentID?: number;
  declare AcademicYearID?: number;
  declare IsActive?: boolean;
}

Program.init(
  {
    ProgramID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ProgramName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ProgramCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    DurationYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    TotalSemesters: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DepartmentID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    AcademicYearID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }
  },
  {
    sequelize,
    tableName: "Programs",
    timestamps: false,
  }
);

export default Program;