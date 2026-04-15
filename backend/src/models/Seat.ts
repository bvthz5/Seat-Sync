import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Room } from "./Room.js";

/**
 * Seat table attributes
 */
interface SeatAttributes {
  SeatID: number;
  RoomID: number;
  RowIndex: string;
  BenchIndex: number;
  SeatIndex: number;
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
  declare RowIndex: string;
  declare BenchIndex: number;
  declare SeatIndex: number;
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
    RowIndex: {
      type: DataTypes.CHAR(1),
      allowNull: false,
    },
    BenchIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    SeatIndex: {
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
    indexes: [
      {
        fields: ["RoomID", "ZoneID"], // Optimize query for room and zone seat filtering
      },
      {
        fields: ["RoomID", "IsActive"], // Optimize active seats query
      },
    ],
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
