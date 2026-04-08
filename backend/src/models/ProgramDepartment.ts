import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

interface ProgramDepartmentAttributes {
  ProgramDepartmentID: number;
  ProgramID: number;
  DepartmentID: number;
}

interface ProgramDepartmentCreationAttributes
  extends Optional<ProgramDepartmentAttributes, "ProgramDepartmentID"> {}

export class ProgramDepartment
  extends Model<ProgramDepartmentAttributes, ProgramDepartmentCreationAttributes>
  implements ProgramDepartmentAttributes
{
  declare ProgramDepartmentID: number;
  declare ProgramID: number;
  declare DepartmentID: number;
}

ProgramDepartment.init(
  {
    ProgramDepartmentID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ProgramID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    DepartmentID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "ProgramDepartments",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["ProgramID", "DepartmentID"],
      },
    ],
  }
);

export default ProgramDepartment;
