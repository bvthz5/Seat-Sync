import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import InternalSeatLayout from "./InternalSeatLayout.js";

interface InternalSeatColumnAttributes {
  ColumnID: number;
  LayoutID: number;
  ColumnLabel: string;
  BenchesCount: number;
}
interface InternalSeatColumnCreationAttributes extends Optional<InternalSeatColumnAttributes, "ColumnID"> {}

export class InternalSeatColumn extends Model<InternalSeatColumnAttributes, InternalSeatColumnCreationAttributes> implements InternalSeatColumnAttributes {
  declare ColumnID: number;
  declare LayoutID: number;
  declare ColumnLabel: string;
  declare BenchesCount: number;
}

InternalSeatColumn.init(
  {
    ColumnID: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    LayoutID: { type: DataTypes.INTEGER, allowNull: false, references: { model: "InternalSeatLayouts", key: "LayoutID" } },
    ColumnLabel: { type: DataTypes.STRING(2), allowNull: false },
    BenchesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: "InternalSeatColumns", timestamps: false }
);

InternalSeatColumn.belongsTo(InternalSeatLayout, { foreignKey: "LayoutID" });
InternalSeatLayout.hasMany(InternalSeatColumn, { foreignKey: "LayoutID" });

export default InternalSeatColumn;
