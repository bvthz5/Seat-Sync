import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import InternalFloor from "./InternalFloor.js";
import InternalBlock from "./InternalBlock.js";

interface InternalRoomAttributes {
  RoomID: number;
  BlockID: number;
  FloorID: number;
  RoomCode: string;
  RoomType: "Classroom" | "Drawing Hall" | "Lab" | "Minor Room" | "Seminar Hall";
  TotalCapacity: number;
  OverrideCap?: number | null;
  RowLayout: number[];
  SeatsPerBench: number;   // 1 = single, 2 = dual (default for internal)
  SeatMode: "Dual" | "Single" | "Mixed";
  Status: "Active" | "Inactive";
  ExamUsable: boolean;
}

interface InternalRoomCreationAttributes extends Optional<InternalRoomAttributes, "RoomID" | "RowLayout" | "SeatsPerBench" | "OverrideCap" | "RoomType" | "SeatMode"> { }

export class InternalRoom extends Model<InternalRoomAttributes, InternalRoomCreationAttributes>
  implements InternalRoomAttributes {
  declare RoomID: number;
  declare BlockID: number;
  declare FloorID: number;
  declare RoomCode: string;
  declare RoomType: "Classroom" | "Drawing Hall" | "Lab" | "Minor Room" | "Seminar Hall";
  declare TotalCapacity: number;
  declare OverrideCap: number | null;
  declare RowLayout: number[];
  declare SeatsPerBench: number;
  declare SeatMode: "Dual" | "Single" | "Mixed";
  declare Status: "Active" | "Inactive";
  declare ExamUsable: boolean;
  declare Block?: InternalBlock;
  declare Floor?: InternalFloor;
}

InternalRoom.init(
  {
    RoomID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    BlockID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "InternalBlocks", key: "BlockID" },
    },
    FloorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "InternalFloors", key: "FloorID" },
    },
    RoomCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "RoomCode",
    },
    RoomType: {
      type: DataTypes.ENUM("Classroom", "Drawing Hall", "Lab", "Minor Room", "Seminar Hall"),
      allowNull: false,
      defaultValue: "Classroom",
    },
    TotalCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    OverrideCap: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    RowLayout: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "[]" as any,
      get() {
        const val = this.getDataValue("RowLayout");
        try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return []; }
      },
      set(val: any) {
        this.setDataValue("RowLayout", (typeof val === "string" ? val : JSON.stringify(val)) as any);
      },
    },
    SeatsPerBench: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2, // Internal exams default to dual seating
    },
    SeatMode: {
      type: DataTypes.ENUM("Dual", "Single", "Mixed"),
      allowNull: false,
      defaultValue: "Dual",
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
    tableName: "InternalRooms",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["RoomCode", "FloorID"] }
    ],
  }
);

InternalRoom.belongsTo(InternalFloor, { foreignKey: "FloorID" });
InternalFloor.hasMany(InternalRoom, { foreignKey: "FloorID" });
InternalRoom.belongsTo(InternalBlock, { foreignKey: "BlockID" });
InternalBlock.hasMany(InternalRoom, { foreignKey: "BlockID" });

export default InternalRoom;
