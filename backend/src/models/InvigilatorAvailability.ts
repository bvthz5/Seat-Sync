import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Invigilator } from "./Invigilator.js";

/**
 * InvigilatorAvailability table attributes
 */
interface InvigilatorAvailabilityAttributes {
  InvigilatorID: number;
  ExamDate: Date;
  Session: string;
  IsAvailable: boolean;
}

export class InvigilatorAvailability extends Model<InvigilatorAvailabilityAttributes>
  implements InvigilatorAvailabilityAttributes {
  declare InvigilatorID: number;
  declare ExamDate: Date;
  declare Session: string;
  declare IsAvailable: boolean;
}

InvigilatorAvailability.init(
  {
    InvigilatorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Invigilators",
        key: "InvigilatorID",
      },
    },
    ExamDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true,
    },
    Session: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true,
    },
    IsAvailable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "InvigilatorAvailability",
    timestamps: false,
  }
);

/**
 * Associations
 */
InvigilatorAvailability.belongsTo(Invigilator, {
  foreignKey: "InvigilatorID",
});

Invigilator.hasMany(InvigilatorAvailability, {
  foreignKey: "InvigilatorID",
});

export default InvigilatorAvailability;