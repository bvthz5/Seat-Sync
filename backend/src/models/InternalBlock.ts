import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

interface InternalBlockAttributes {
  BlockID: number;
  BlockName: string;
  Status: "Active" | "Inactive";
}

interface InternalBlockCreationAttributes extends Optional<InternalBlockAttributes, "BlockID"> { }

export class InternalBlock extends Model<InternalBlockAttributes, InternalBlockCreationAttributes>
  implements InternalBlockAttributes {
  declare BlockID: number;
  declare BlockName: string;
  declare Status: "Active" | "Inactive";
}

InternalBlock.init(
  {
    BlockID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    BlockName: {
      type: DataTypes.STRING(50),
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
    tableName: "InternalBlocks",
    timestamps: false,
  }
);

export default InternalBlock;
