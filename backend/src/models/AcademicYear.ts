import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * AcademicYear table attributes
 */
interface AcademicYearAttributes {
    AcademicYearID: number;
    YearName: string; // e.g., "2025-2026"
    StartDate: Date;
    EndDate: Date;
    IsActive: boolean;
    IsCurrent: boolean;
    CreatedAt: Date;
    UpdatedAt: Date;
}

/**
 * Attributes required when creating an academic year
 */
interface AcademicYearCreationAttributes
    extends Optional<AcademicYearAttributes, "AcademicYearID" | "IsActive" | "IsCurrent" | "CreatedAt" | "UpdatedAt"> { }

export class AcademicYear extends Model<AcademicYearAttributes, AcademicYearCreationAttributes>
    implements AcademicYearAttributes {
    declare AcademicYearID: number;
    declare YearName: string;
    declare StartDate: Date;
    declare EndDate: Date;
    declare IsActive: boolean;
    declare IsCurrent: boolean;
    declare CreatedAt: Date;
    declare UpdatedAt: Date;
}

AcademicYear.init(
    {
        AcademicYearID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        YearName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },

        StartDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        EndDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        IsActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },

        IsCurrent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },

        CreatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

        UpdatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: "AcademicYears",
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['YearName']
            }
        ]
    }
);

export default AcademicYear;
