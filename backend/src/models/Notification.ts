import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Notification table attributes
 */
interface NotificationAttributes {
    NotificationID: number;
    Title: string;
    Message: string;
    TargetRole: "student" | "invigilator" | "all";
    SentBy: number; // UserID of admin who sent it
    SentAt: Date;
    ScheduledFor: Date | null;
    IsRead: boolean;
    CreatedAt: Date;
}

/**
 * Attributes required when creating a notification
 */
interface NotificationCreationAttributes
    extends Optional<NotificationAttributes, "NotificationID" | "IsRead" | "ScheduledFor" | "CreatedAt"> { }

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes>
    implements NotificationAttributes {
    declare NotificationID: number;
    declare Title: string;
    declare Message: string;
    declare TargetRole: "student" | "invigilator" | "all";
    declare SentBy: number;
    declare SentAt: Date;
    declare ScheduledFor: Date | null;
    declare IsRead: boolean;
    declare CreatedAt: Date;
}

Notification.init(
    {
        NotificationID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        Title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },

        Message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        TargetRole: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['student', 'invigilator', 'all']]
            }
        },

        SentBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'UserID'
            }
        },

        SentAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        ScheduledFor: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        IsRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },

        CreatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: "Notifications",
        timestamps: false,
    }
);

export default Notification;
