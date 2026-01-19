import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Department table attributes
 */
interface DepartmentAttributes {
  DepartmentID: number;
  DepartmentCode: string;
  DepartmentName: string;
}

/**
 * Attributes required when creating a department
 */
interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, "DepartmentID"> {}

export class Department extends Model<DepartmentAttributes, DepartmentCreationAttributes>
  implements DepartmentAttributes {
  declare DepartmentID: number;
  declare DepartmentCode: string;
  declare DepartmentName: string;
}

Department.init(
  {
    DepartmentID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    DepartmentCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    DepartmentName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "Departments",
    timestamps: false,
  }
);

export default Department;