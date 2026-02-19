import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Notification } from "./Notification.js";
import { User } from "./User.js";

interface NotificationRecipientAttributes {
    RecipientID: number;
    NotificationID: number;
    UserID: number;
    IsRead: boolean;
    ReadAt: Date | null;
}

interface NotificationRecipientCreationAttributes
    extends Optional<NotificationRecipientAttributes, "RecipientID" | "IsRead" | "ReadAt"> { }

export class NotificationRecipient extends Model<NotificationRecipientAttributes, NotificationRecipientCreationAttributes>
    implements NotificationRecipientAttributes {
    declare RecipientID: number;
    declare NotificationID: number;
    declare UserID: number;
    declare IsRead: boolean;
    declare ReadAt: Date | null;
}

NotificationRecipient.init(
    {
        RecipientID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        NotificationID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Notifications',
                key: 'NotificationID'
            },
            onDelete: 'CASCADE'
        },
        UserID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'UserID'
            },
            onDelete: 'CASCADE'
        },
        IsRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        ReadAt: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: "NotificationRecipients",
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['NotificationID', 'UserID']
            },
            {
                fields: ['UserID', 'IsRead']
            }
        ]
    }
);

export default NotificationRecipient;
