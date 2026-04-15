import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Semester } from "./Semester.js";

/**
 * ExamSeries table attributes
 */
interface ExamSeriesAttributes {
    ExamSeriesID: number;
    SeriesName: string;
    ExamType: 'Internal' | 'EndSemester';
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
    declare ExamType: 'Internal' | 'EndSemester';
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
            unique: true,
        },
        ExamType: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'Internal',
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
ExamSeries.belongsTo(Semester, {
    foreignKey: "SemesterID",
});

Semester.hasMany(ExamSeries, {
    foreignKey: "SemesterID",
    onDelete: 'CASCADE',
});

export default ExamSeries;
