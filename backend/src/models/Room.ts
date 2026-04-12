import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Floor } from "./Floor.js";
import { Block } from "./Block.js";

/**
 * Room table attributes
 */
interface RoomAttributes {
  RoomID: number;
  BlockID: number;
  FloorID: number;
  RoomCode: string; // Renamed from RoomName
  Capacity: number; // New field
  RoomType: "ROOM" | "HALL";
  LayoutType: "CUSTOM";
  RowLayout: number[];
  SeatsPerBench: number;
  Status: "Active" | "Inactive";
  ExamUsable: boolean;
  IsLayoutLocked: boolean;
}

/**
 * Attributes required when creating a room
 */
interface RoomCreationAttributes extends Optional<RoomAttributes, "RoomID" | "RoomType" | "LayoutType" | "RowLayout" | "SeatsPerBench" | "IsLayoutLocked"> { }

export class Room extends Model<RoomAttributes, RoomCreationAttributes>
  implements RoomAttributes {
  declare RoomID: number;
  declare BlockID: number;
  declare FloorID: number;
  declare RoomCode: string;
  declare Capacity: number;
  declare RoomType: "ROOM" | "HALL";
  declare LayoutType: "CUSTOM";
  declare RowLayout: number[];
  declare SeatsPerBench: number;
  declare Status: "Active" | "Inactive";
  declare ExamUsable: boolean;
  declare IsLayoutLocked: boolean;
}

Room.init(
  {
    RoomID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    BlockID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Blocks",
        key: "BlockID",
      },
    },
    FloorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Floors",
        key: "FloorID",
      },
    },
    RoomCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'RoomName'
    },
    Capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    RoomType: {
      type: DataTypes.ENUM("ROOM", "HALL"),
      allowNull: false,
      defaultValue: "ROOM",
    },
    LayoutType: {
      type: DataTypes.ENUM("CUSTOM"),
      allowNull: false,
      defaultValue: "CUSTOM",
    },
    RowLayout: {
      type: DataTypes.JSON, // or STRING if you parse manually
      allowNull: false,
      defaultValue: [],
    },
    SeatsPerBench: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    Status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active",
    },
    ExamUsable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    IsLayoutLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "Rooms",
    timestamps: true, // User requested CreatedAt DATETIME DEFAULT GETDATE() which sequelize handles with timestamps: true (createdAt/updatedAt)
    indexes: [
      {
        unique: true,
        fields: ['RoomName', 'FloorID'] // Using actual DB column name since RoomCode maps to RoomName
      }
    ]
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

Room.belongsTo(Block, {
  foreignKey: "BlockID",
});

Block.hasMany(Room, {
  foreignKey: "BlockID",
});

export default Room;