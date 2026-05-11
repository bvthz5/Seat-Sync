const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../backend/src/models');
const servicesDir = path.join(__dirname, '../backend/src/services/internal');
const controllersDir = path.join(__dirname, '../backend/src/controllers/internal');
const routesDir = path.join(__dirname, '../backend/src/routes/internal');

if (!fs.existsSync(servicesDir)) fs.mkdirSync(servicesDir, { recursive: true });
if (!fs.existsSync(controllersDir)) fs.mkdirSync(controllersDir, { recursive: true });
if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });

fs.writeFileSync(path.join(modelsDir, 'InternalSeatLayout.ts'), `import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import InternalRoom from "./InternalRoom.js";

interface InternalSeatLayoutAttributes {
  LayoutID: number;
  RoomID: number;
  LayoutVersion: number;
  TotalCapacity: number;
  ActiveCapacity: number;
  SeatingMode: "Dual" | "Single" | "Mixed";
  Pattern: string;
  UpdatedAt: Date;
}

interface InternalSeatLayoutCreationAttributes extends Optional<InternalSeatLayoutAttributes, "LayoutID" | "UpdatedAt"> {}

export class InternalSeatLayout extends Model<InternalSeatLayoutAttributes, InternalSeatLayoutCreationAttributes> implements InternalSeatLayoutAttributes {
  declare LayoutID: number;
  declare RoomID: number;
  declare LayoutVersion: number;
  declare TotalCapacity: number;
  declare ActiveCapacity: number;
  declare SeatingMode: "Dual" | "Single" | "Mixed";
  declare Pattern: string;
  declare UpdatedAt: Date;
}

InternalSeatLayout.init(
  {
    LayoutID: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    RoomID: { type: DataTypes.INTEGER, allowNull: false, references: { model: "InternalRooms", key: "RoomID" } },
    LayoutVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    TotalCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ActiveCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    SeatingMode: { type: DataTypes.ENUM("Dual", "Single", "Mixed"), allowNull: false, defaultValue: "Dual" },
    Pattern: { type: DataTypes.STRING, allowNull: false, defaultValue: "standard" },
    UpdatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { sequelize, tableName: "InternalSeatLayouts", timestamps: false }
);

InternalSeatLayout.belongsTo(InternalRoom, { foreignKey: "RoomID" });
InternalRoom.hasOne(InternalSeatLayout, { foreignKey: "RoomID" });

export default InternalSeatLayout;
`);

fs.writeFileSync(path.join(modelsDir, 'InternalSeatColumn.ts'), `import { DataTypes, Model, Optional } from "sequelize";
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
`);

console.log("Models created!");
