import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";

interface PasswordResetAttributes {
    ResetID: number;
    UserID: number;
    TokenHash: string;
    ExpiresAt: Date;
    UsedAt: Date | null;
    CreatedAt: Date;
}

interface PasswordResetCreationAttributes extends Optional<PasswordResetAttributes, "ResetID" | "UsedAt" | "CreatedAt"> { }

export class PasswordReset extends Model<PasswordResetAttributes, PasswordResetCreationAttributes> implements PasswordResetAttributes {
    declare ResetID: number;
    declare UserID: number;
    declare TokenHash: string;
    declare ExpiresAt: Date;
    declare UsedAt: Date | null;
    declare CreatedAt: Date;
}

PasswordReset.init(
    {
        ResetID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        UserID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'UserID'
            }
        },
        TokenHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        ExpiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        UsedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        CreatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: "PasswordResets",
        timestamps: false,
    }
);

// Define Association
User.hasMany(PasswordReset, { foreignKey: 'UserID', as: 'PasswordResets' });
PasswordReset.belongsTo(User, { foreignKey: 'UserID' });

export default PasswordReset;
