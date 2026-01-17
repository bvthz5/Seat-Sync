import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Floor } from "./Floor.js";

/**
 * Room table attributes
 */
interface RoomAttributes {
  RoomID: number;
  FloorID: number;
  RoomName: string;
  TotalRows: number;
  BenchesPerRow: number;
  SeatsPerBench: number;
}

/**
 * Attributes required when creating a room
 */
interface RoomCreationAttributes extends Optional<RoomAttributes, "RoomID"> {}

export class Room extends Model<RoomAttributes, RoomCreationAttributes>
  implements RoomAttributes {
  declare RoomID: number;
  declare FloorID: number;
  declare RoomName: string;
  declare TotalRows: number;
  declare BenchesPerRow: number;
  declare SeatsPerBench: number;
}

Room.init(
  {
    RoomID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    FloorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Floors",
        key: "FloorID",
      },
    },
    RoomName: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    TotalRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    BenchesPerRow: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    SeatsPerBench: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "Rooms",
    timestamps: false,
  }
);

/**
 * Associations
 */
Room.belongsTo(Floor, {
  foreignKey: "FloorID",
});

Floor.hasMany(Room, {
  foreignKey: "FloorID",
});

export default Room;