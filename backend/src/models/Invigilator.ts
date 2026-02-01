import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";

/**
 * Invigilator table attributes
 */
interface InvigilatorAttributes {
  InvigilatorID: number;
  UserID: number;
  DepartmentID?: number;
  isEligible: boolean;
  isFlagged: boolean;
}

/**
 * Attributes required when creating an invigilator
 */
interface InvigilatorCreationAttributes extends Optional<InvigilatorAttributes, "InvigilatorID" | "isFlagged" | "isEligible" | "DepartmentID"> { }

export class Invigilator extends Model<InvigilatorAttributes, InvigilatorCreationAttributes>
  implements InvigilatorAttributes {
  declare InvigilatorID: number;
  declare UserID: number;
  declare DepartmentID?: number;
  declare isEligible: boolean;
  declare isFlagged: boolean;
}

Invigilator.init(
  {
    InvigilatorID: {
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
    DepartmentID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Departments",
        key: "DepartmentID",
      },
    },
    isEligible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isFlagged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "Invigilators",
    timestamps: false,
  }
);

/**
 * Associations
 */
Invigilator.belongsTo(User, {
  foreignKey: "UserID",
});

User.hasOne(Invigilator, {
  foreignKey: "UserID",
});

export default Invigilator;