import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Room } from "./Room.js";

/**
 * Seat table attributes
 */
interface SeatAttributes {
  SeatID: number;
  RoomID: number;
  RowLabel: string;
  BenchNumber: number;
  SeatNumber: number;
  IsActive: boolean;
  ZoneID: number | null;
}

/**
 * Attributes required when creating a seat
 */
interface SeatCreationAttributes extends Optional<SeatAttributes, "SeatID" | "IsActive" | "ZoneID"> { }

export class Seat extends Model<SeatAttributes, SeatCreationAttributes>
  implements SeatAttributes {
  declare SeatID: number;
  declare RoomID: number;
  declare RowLabel: string;
  declare BenchNumber: number;
  declare SeatNumber: number;
  declare IsActive: boolean;
  declare ZoneID: number | null;
}

Seat.init(
  {
    SeatID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    RoomID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Rooms",
        key: "RoomID",
      },
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
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    ZoneID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Zones",
        key: "ZoneID",
      },
    },
  },
  {
    sequelize,
    tableName: "Seats",
    timestamps: false,
  }
);

/**
 * Associations
 */
Seat.belongsTo(Room, {
  foreignKey: "RoomID",
});

Room.hasMany(Seat, {
  foreignKey: "RoomID",
});

export default Seat;