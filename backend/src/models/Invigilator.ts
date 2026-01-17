import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";

/**
 * Invigilator table attributes
 */
interface InvigilatorAttributes {
  InvigilatorID: number;
  UserID: number;
}

/**
 * Attributes required when creating an invigilator
 */
interface InvigilatorCreationAttributes extends Optional<InvigilatorAttributes, "InvigilatorID"> {}

export class Invigilator extends Model<InvigilatorAttributes, InvigilatorCreationAttributes>
  implements InvigilatorAttributes {
  declare InvigilatorID: number;
  declare UserID: number;
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