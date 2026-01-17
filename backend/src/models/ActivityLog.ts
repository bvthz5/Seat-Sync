import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";

/**
 * ActivityLog table attributes
 */
interface ActivityLogAttributes {
  LogID: number;
  UserID: number;
  Action: string;
  Timestamp: Date;
  Details?: string;
}

/**
 * Attributes required when creating an activity log
 */
interface ActivityLogCreationAttributes
  extends Optional<ActivityLogAttributes, "LogID" | "Timestamp"> {}

export class ActivityLog
  extends Model<ActivityLogAttributes, ActivityLogCreationAttributes>
  implements ActivityLogAttributes
{
  declare LogID: number;
  declare UserID: number;
  declare Action: string;
  declare Timestamp: Date;
  declare Details?: string;
}

ActivityLog.init(
  {
    LogID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "UserID",
      },
    },
    Action: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    Timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    Details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "ActivityLogs",
    timestamps: false,
  }
);

/**
 * Associations
 */
ActivityLog.belongsTo(User, {
  foreignKey: "UserID",
});

User.hasMany(ActivityLog, {
  foreignKey: "UserID",
});

export default ActivityLog;
