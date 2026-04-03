import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * User table attributes
 */
interface UserAttributes {
  UserID: number;
  Email: string;
  FullName: string | null;
  PasswordHash: string;
  Role: "exam_admin" | "invigilator" | "student";
  IsRootAdmin: boolean;
  IsActive: boolean;
  IsPasswordChanged: boolean;
  CreatedAt: Date;
  IsActivated: boolean;
  ActivationToken: string | null;
  ActivationExpiresAt: Date | null;
}

/**
 * Attributes required when creating a user
 */
interface UserCreationAttributes
  extends Optional<UserAttributes, "UserID" | "IsRootAdmin" | "IsActive" | "IsPasswordChanged" | "CreatedAt" | "IsActivated" | "ActivationToken" | "ActivationExpiresAt"> { }

export class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  declare UserID: number;
  declare Email: string;
  declare FullName: string | null;
  declare PasswordHash: string;
  declare Role: "exam_admin" | "invigilator" | "student";
  declare IsRootAdmin: boolean;
  declare IsActive: boolean;
  declare IsPasswordChanged: boolean;
  declare CreatedAt: Date;
  declare IsActivated: boolean;
  declare ActivationToken: string | null;
  declare ActivationExpiresAt: Date | null;
}

User.init(
  {
    UserID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    Email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      // unique: true, // Removed to avoid MSSQL syntax issues
    },

    FullName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    PasswordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    Role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['exam_admin', 'invigilator', 'student']]
      }
    },

    IsRootAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    IsPasswordChanged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    IsActivated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ActivationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ActivationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ActivationExpires",
    },
  },
  {
    sequelize,
    tableName: "Users",
    timestamps: false, // we are manually controlling CreatedAt
    indexes: [
      {
        unique: true,
        fields: ['Email']
      }
    ]
  }
);

export default User;