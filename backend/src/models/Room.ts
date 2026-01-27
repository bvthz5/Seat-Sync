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
  TotalRows: number;
  BenchesPerRow: number;
  SeatsPerBench: number;
  Status: "Active" | "Inactive";
  ExamUsable: boolean;
}

/**
 * Attributes required when creating a room
 */
interface RoomCreationAttributes extends Optional<RoomAttributes, "RoomID" | "TotalRows" | "BenchesPerRow" | "SeatsPerBench"> { }

export class Room extends Model<RoomAttributes, RoomCreationAttributes>
  implements RoomAttributes {
  declare RoomID: number;
  declare BlockID: number;
  declare FloorID: number;
  declare RoomCode: string;
  declare Capacity: number;
  declare TotalRows: number;
  declare BenchesPerRow: number;
  declare SeatsPerBench: number;
  declare Status: "Active" | "Inactive";
  declare ExamUsable: boolean;
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
    },
    Capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    TotalRows: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    BenchesPerRow: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    SeatsPerBench: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
  },
  {
    sequelize,
    tableName: "Rooms",
    timestamps: true, // User requested CreatedAt DATETIME DEFAULT GETDATE() which sequelize handles with timestamps: true (createdAt/updatedAt)
    indexes: [
      {
        unique: true,
        fields: ['RoomCode', 'FloorID']
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