import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

interface DutySwapAttributes {
  SwapID: number;
  ExamID: number;
  RoomID: number;
  RequesterID: number; // FacultyID of requester
  SubstituteID: number | null; // FacultyID of substitute (chosen by admin later)
  Reason: string;
  Status: "PENDING" | "APPROVED" | "REJECTED";
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface DutySwapCreationAttributes extends Optional<DutySwapAttributes, "SwapID" | "Status" | "CreatedAt" | "UpdatedAt"> { }

export class DutySwap extends Model<DutySwapAttributes, DutySwapCreationAttributes> implements DutySwapAttributes {
  declare SwapID: number;
  declare ExamID: number;
  declare RoomID: number;
  declare RequesterID: number;
  declare SubstituteID: number | null;
  declare Reason: string;
  declare Status: "PENDING" | "APPROVED" | "REJECTED";
  declare CreatedAt: Date;
  declare UpdatedAt: Date;
}

DutySwap.init(
  {
    SwapID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ExamID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    RoomID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    RequesterID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    SubstituteID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING",
    },
    CreatedAt: {
      type: "DATETIME2",
      allowNull: false,
      defaultValue: sequelize.literal('GETDATE()'),
    },
    UpdatedAt: {
      type: "DATETIME2",
      allowNull: false,
      defaultValue: sequelize.literal('GETDATE()'),
    },
  },
  {
    sequelize,
    tableName: "DutySwaps",
    timestamps: false,
  }
);

export default DutySwap;
