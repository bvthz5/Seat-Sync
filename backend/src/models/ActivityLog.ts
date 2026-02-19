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
  EntityType?: string;
  EntityID?: number;
  IPAddress?: string;
  UserAgent?: string;
  Timestamp: Date;
  Details?: string;
  Severity: 'Info' | 'Warning' | 'Critical';
  Status: 'Success' | 'Failure';
  Metadata?: object; // New field for JSON structured data
}

/**
 * Attributes required when creating an activity log
 */
interface ActivityLogCreationAttributes
  extends Optional<ActivityLogAttributes, "LogID" | "Timestamp" | "EntityType" | "EntityID" | "IPAddress" | "UserAgent" | "Details" | "Severity" | "Status" | "Metadata"> { }

export class ActivityLog
  extends Model<ActivityLogAttributes, ActivityLogCreationAttributes>
  implements ActivityLogAttributes {
  declare LogID: number;
  declare UserID: number;
  declare Action: string;
  declare EntityType?: string;
  declare EntityID?: number;
  declare IPAddress?: string;
  declare UserAgent?: string;
  declare Timestamp: Date;
  declare Details?: string;
  declare Severity: 'Info' | 'Warning' | 'Critical';
  declare Status: 'Success' | 'Failure';
  declare Metadata?: object;
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
    EntityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    EntityID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    IPAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    UserAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
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
    Severity: {
      type: DataTypes.ENUM('Info', 'Warning', 'Critical'),
      allowNull: false,
      defaultValue: 'Info',
    },
    Status: {
      type: DataTypes.ENUM('Success', 'Failure'),
      allowNull: false,
      defaultValue: 'Success',
    },
    Metadata: {
      type: DataTypes.JSON,
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
