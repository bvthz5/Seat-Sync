import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export class InternalExamSeries extends Model {
    public InternalExamSeriesID!: number;
    public SeriesName!: string;
    public IsActive!: boolean;
    public createdAt!: Date;
    public updatedAt!: Date;
}

InternalExamSeries.init({
    InternalExamSeriesID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    SeriesName: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    AcademicYearID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        field: "createdAt",
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: "updatedAt",
    }
}, {
    sequelize,
    modelName: 'InternalExamSeries',
    tableName: 'InternalExamSeries',
    timestamps: true,
});
