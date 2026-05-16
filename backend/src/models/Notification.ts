import { DataTypes, Model, Optional, literal } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Notification table attributes
 */
interface NotificationAttributes {
    NotificationID: number;
    Title: string;
    Message: string;
    Type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "EMERGENCY";
    Category: "SYSTEM" | "EXAM" | "ADMIN" | "STUDENT" | "SECURITY";
    TargetType: "ALL" | "ROLE" | "USER" | "EXAM" | "DEPARTMENT";
    TargetId: string | null; // Can be Role Name, UserID, ExamID, etc.
    Priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    Metadata: any | null; // JSON
    SentBy: number; // UserID of admin who sent it (0 for System)
    SentAt: Date;
    ExpiresAt: Date | null;
}

/**
 * Attributes required when creating a notification
 */
interface NotificationCreationAttributes
    extends Optional<NotificationAttributes, "NotificationID" | "Metadata" | "TargetId" | "ExpiresAt"> { }

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes>
    implements NotificationAttributes {
    declare NotificationID: number;
    declare Title: string;
    declare Message: string;
    declare Type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "EMERGENCY";
    declare Category: "SYSTEM" | "EXAM" | "ADMIN" | "STUDENT" | "SECURITY";
    declare TargetType: "ALL" | "ROLE" | "USER" | "EXAM" | "DEPARTMENT";
    declare TargetId: string | null;
    declare Priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    declare Metadata: any | null;
    declare SentBy: number;
    declare SentAt: Date;
    declare ExpiresAt: Date | null;
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
        Type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "INFO",
            validate: {
                isIn: [['INFO', 'WARNING', 'ERROR', 'SUCCESS', 'EMERGENCY']]
            }
        },
        Category: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "SYSTEM",
            validate: {
                isIn: [['SYSTEM', 'EXAM', 'ADMIN', 'STUDENT', 'SECURITY']]
            }
        },
        TargetType: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "ALL",
            validate: {
                isIn: [['ALL', 'ROLE', 'USER', 'EXAM', 'DEPARTMENT']]
            }
        },
        TargetId: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        Priority: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "NORMAL",
            validate: {
                isIn: [['LOW', 'NORMAL', 'HIGH', 'CRITICAL']]
            }
        },
        Metadata: {
            type: DataTypes.TEXT, // Stored as JSON string in SQL Server if needed, or modify to JSON based on dialect
            allowNull: true,
            get() {
                const rawValue = this.getDataValue('Metadata');
                return rawValue ? JSON.parse(rawValue as unknown as string) : null;
            },
            set(value) {
                this.setDataValue('Metadata', JSON.stringify(value));
            }
        },
        SentBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0 // 0 = System
        },
        SentAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: literal('GETDATE()'),
        },
        ExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "Notifications",
        timestamps: false,
    }
);

export default Notification;
