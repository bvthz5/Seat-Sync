import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * ActiveSession table attributes - Tracks logged-in users
 */
interface ActiveSessionAttributes {
    SessionID: number;
    UserID: number;
    Token: string; // JWT token hash
    IPAddress: string;
    UserAgent: string;
    LoginAt: Date;
    LastActivity: Date;
    ExpiresAt: Date;
    IsActive: boolean;
}

/**
 * Attributes required when creating a session
 */
interface ActiveSessionCreationAttributes
    extends Optional<ActiveSessionAttributes, "SessionID" | "LastActivity" | "IsActive"> { }

export class ActiveSession extends Model<ActiveSessionAttributes, ActiveSessionCreationAttributes>
    implements ActiveSessionAttributes {
    declare SessionID: number;
    declare UserID: number;
    declare Token: string;
    declare IPAddress: string;
    declare UserAgent: string;
    declare LoginAt: Date;
    declare LastActivity: Date;
    declare ExpiresAt: Date;
    declare IsActive: boolean;
}

ActiveSession.init(
    {
        SessionID: {
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

        Token: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },

        IPAddress: {
            type: DataTypes.STRING(45),
            allowNull: false,
        },

        UserAgent: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },

        LoginAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        LastActivity: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        ExpiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },

        IsActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: "ActiveSessions",
        timestamps: false,
        indexes: [
            {
                fields: ['UserID']
            },
            {
                fields: ['Token']
            }
        ]
    }
);

export default ActiveSession;
