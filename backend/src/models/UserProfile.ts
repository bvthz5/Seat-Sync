import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";

/**
 * UserProfile attributes
 */
interface UserProfileAttributes {
  UserID: number;
  FullName: string;
  Phone?: string | null;
  Avatar?: string | null;
  DateOfBirth?: Date | null;
  Gender?: "Male" | "Female" | "Other" | null;
}

export class UserProfile
  extends Model<UserProfileAttributes>
  implements UserProfileAttributes {
  declare UserID: number;
  declare FullName: string;
  declare Phone?: string | null;
  declare Avatar?: string | null;
  declare DateOfBirth?: Date | null;
  declare Gender?: "Male" | "Female" | "Other" | null;
}

UserProfile.init(
  {
    UserID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },

    FullName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    Phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    Avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    DateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    Gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "UserProfiles",
    timestamps: false,
  }
);

/**
 * Associations
 * Users 1 ─── 1 UserProfiles
 */
User.hasOne(UserProfile, {
  foreignKey: "UserID",
  onDelete: "CASCADE",
});

UserProfile.belongsTo(User, {
  foreignKey: "UserID",
});

export default UserProfile;