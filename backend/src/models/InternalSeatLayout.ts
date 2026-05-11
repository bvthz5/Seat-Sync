import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import InternalRoom from "./InternalRoom.js";

interface InternalSeatLayoutAttributes {
  LayoutID: number;
  RoomID: number;
  LayoutVersion: number;
  TotalCapacity: number;
  ActiveCapacity: number;
  SeatingMode: "Dual" | "Single" | "Mixed";
  Pattern: string;
  UpdatedAt: Date;
}

interface InternalSeatLayoutCreationAttributes extends Optional<InternalSeatLayoutAttributes, "LayoutID" | "UpdatedAt"> {}

export class InternalSeatLayout extends Model<InternalSeatLayoutAttributes, InternalSeatLayoutCreationAttributes> implements InternalSeatLayoutAttributes {
  declare LayoutID: number;
  declare RoomID: number;
  declare LayoutVersion: number;
  declare TotalCapacity: number;
  declare ActiveCapacity: number;
  declare SeatingMode: "Dual" | "Single" | "Mixed";
  declare Pattern: string;
  declare UpdatedAt: Date;
}

InternalSeatLayout.init(
  {
    LayoutID: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    RoomID: { type: DataTypes.INTEGER, allowNull: false, references: { model: "InternalRooms", key: "RoomID" } },
    LayoutVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    TotalCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ActiveCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    SeatingMode: { type: DataTypes.ENUM("Dual", "Single", "Mixed"), allowNull: false, defaultValue: "Dual" },
    Pattern: { type: DataTypes.STRING, allowNull: false, defaultValue: "standard" },
    UpdatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { sequelize, tableName: "InternalSeatLayouts", timestamps: false }
);

InternalSeatLayout.belongsTo(InternalRoom, { foreignKey: "RoomID" });
InternalRoom.hasOne(InternalSeatLayout, { foreignKey: "RoomID" });

export default InternalSeatLayout;
