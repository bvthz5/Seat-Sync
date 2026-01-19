import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Block } from "./Block.js";

/**
 * Floor table attributes
 */
interface FloorAttributes {
  FloorID: number;
  BlockID: number;
  FloorNumber: number;
}

/**
 * Attributes required when creating a floor
 */
interface FloorCreationAttributes extends Optional<FloorAttributes, "FloorID"> {}

export class Floor extends Model<FloorAttributes, FloorCreationAttributes>
  implements FloorAttributes {
  declare FloorID: number;
  declare BlockID: number;
  declare FloorNumber: number;
}

Floor.init(
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
        model: "Blocks",
        key: "BlockID",
      },
    },
    FloorNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "Floors",
    timestamps: false,
  }
);

/**
 * Associations
 */
Floor.belongsTo(Block, {
  foreignKey: "BlockID",
});

Block.hasMany(Floor, {
  foreignKey: "BlockID",
});

export default Floor;