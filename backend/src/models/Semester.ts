import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Program } from "./Program.js";

/**
 * Semester table attributes
 */
interface SemesterAttributes {
  SemesterID: number;
  SemesterNumber?: number;
  SemesterName?: string;
  ProgramID: number;
}

/**
 * Attributes required when creating a semester
 */
interface SemesterCreationAttributes extends Optional<SemesterAttributes, "SemesterID"> { }

export class Semester extends Model<SemesterAttributes, SemesterCreationAttributes>
  implements SemesterAttributes {
  declare SemesterID: number;
  declare SemesterNumber?: number;
  declare SemesterName?: string;
  declare ProgramID: number;
}

Semester.init(
  {
    SemesterID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    SemesterNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    SemesterName: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ProgramID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Programs",
        key: "ProgramID",
      },
    },
  },
  {
    sequelize,
    tableName: "Semesters",
    timestamps: false,
  }
);

/**
 * Associations
 */
Semester.belongsTo(Program, {
  foreignKey: "ProgramID",
});

Program.hasMany(Semester, {
  foreignKey: "ProgramID",
});

export default Semester;