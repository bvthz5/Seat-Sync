import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import InternalBlock from "./InternalBlock.js";

interface InternalFloorAttributes {
  FloorID: number;
  BlockID: number;
  FloorNumber: number;
  Status: "Active" | "Inactive";
}

interface InternalFloorCreationAttributes extends Optional<InternalFloorAttributes, "FloorID"> { }

export class InternalFloor extends Model<InternalFloorAttributes, InternalFloorCreationAttributes>
  implements InternalFloorAttributes {
  declare FloorID: number;
  declare BlockID: number;
  declare FloorNumber: number;
  declare Status: "Active" | "Inactive";
}

InternalFloor.init(
  {
    FloorID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    BlockID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "InternalBlocks",
        key: "BlockID",
      },
    },
    FloorNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active",
    },
  },
  {
    sequelize,
    tableName: "InternalFloors",
    timestamps: false,
  }
);

// Associations are managed in models/index.ts

export default InternalFloor;
