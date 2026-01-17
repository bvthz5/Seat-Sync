import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Program table attributes
 */
interface ProgramAttributes {
  ProgramID: number;
  ProgramName: string;
}

/**
 * Attributes required when creating a program
 */
interface ProgramCreationAttributes extends Optional<ProgramAttributes, "ProgramID"> {}

export class Program extends Model<ProgramAttributes, ProgramCreationAttributes>
  implements ProgramAttributes {
  declare ProgramID: number;
  declare ProgramName: string;
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
  },
  {
    sequelize,
    tableName: "Programs",
    timestamps: false,
  }
);

export default Program;