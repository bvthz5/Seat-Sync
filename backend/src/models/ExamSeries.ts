import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { AcademicYear } from "./AcademicYear.js";
import { Semester } from "./Semester.js";

/**
 * ExamSeries table attributes
 */
interface ExamSeriesAttributes {
    ExamSeriesID: number;
    SeriesName: string;
    AcademicYearID: number;
    SemesterID?: number;
    Description?: string;
    IsActive?: boolean;
}

/**
 * Attributes required when creating an exam series
 */
interface ExamSeriesCreationAttributes extends Optional<ExamSeriesAttributes, "ExamSeriesID"> { }

export class ExamSeries extends Model<ExamSeriesAttributes, ExamSeriesCreationAttributes>
    implements ExamSeriesAttributes {
    declare ExamSeriesID: number;
    declare SeriesName: string;
    declare AcademicYearID: number;
    declare SemesterID?: number;
    declare Description?: string;
    declare IsActive?: boolean;
}

ExamSeries.init(
    {
        ExamSeriesID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        SeriesName: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        AcademicYearID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "AcademicYears",
                key: "AcademicYearID",
            },
        },
        SemesterID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Semesters",
                key: "SemesterID",
            },
        },
        Description: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        IsActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    },
    {
        sequelize,
        tableName: "ExamSeries",
        timestamps: true,
    }
);

/**
 * Associations
 */
ExamSeries.belongsTo(AcademicYear, {
    foreignKey: "AcademicYearID",
});

AcademicYear.hasMany(ExamSeries, {
    foreignKey: "AcademicYearID",
    onDelete: 'CASCADE',
});

ExamSeries.belongsTo(Semester, {
    foreignKey: "SemesterID",
});

Semester.hasMany(ExamSeries, {
    foreignKey: "SemesterID",
    onDelete: 'CASCADE',
});

export default ExamSeries;
