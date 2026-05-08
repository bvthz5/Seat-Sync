import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { InternalRoom } from "./InternalRoom.js";

interface InternalSeatAttributes {
  SeatID: number;
  RoomID: number;
  RowLabel: string;    // "A", "B", "C"...
  BenchNumber: number; // 1, 2, 3...
  SeatNumber: number;  // 1 = Left, 2 = Right (for dual seating)
  IsActive: boolean;
}

interface InternalSeatCreationAttributes extends Optional<InternalSeatAttributes, "SeatID" | "IsActive"> { }

export class InternalSeat extends Model<InternalSeatAttributes, InternalSeatCreationAttributes>
  implements InternalSeatAttributes {
  declare SeatID: number;
  declare RoomID: number;
  declare RowLabel: string;
  declare BenchNumber: number;
  declare SeatNumber: number;
  declare IsActive: boolean;
}

InternalSeat.init(
  {
    SeatID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    RoomID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "InternalRooms", key: "RoomID" },
    },
    RowLabel: {
      type: DataTypes.CHAR(1),
      allowNull: false,
    },
    BenchNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    SeatNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // 1 = Left seat, 2 = Right seat
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "InternalSeats",
    timestamps: false,
    indexes: [
      { fields: ["RoomID", "IsActive"] },
      { fields: ["RoomID", "RowLabel", "BenchNumber"] },
    ],
  }
);

InternalSeat.belongsTo(InternalRoom, { foreignKey: "RoomID" });
InternalRoom.hasMany(InternalSeat, { foreignKey: "RoomID" });

export default InternalSeat;
