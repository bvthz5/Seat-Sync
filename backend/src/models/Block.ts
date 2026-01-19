import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Block table attributes
 */
interface BlockAttributes {
  BlockID: number;
  BlockName: string;
}

/**
 * Attributes required when creating a block
 */
interface BlockCreationAttributes extends Optional<BlockAttributes, "BlockID"> {}

export class Block extends Model<BlockAttributes, BlockCreationAttributes>
  implements BlockAttributes {
  declare BlockID: number;
  declare BlockName: string;
}

Block.init(
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
  },
  {
    sequelize,
    tableName: "Blocks",
    timestamps: false,
  }
);

export default Block;