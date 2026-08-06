import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export class InternalExamDepartment extends Model {
    declare public InternalExamDepartmentID: number;
    declare public InternalExamID: number;
    declare public DepartmentID: number;
    declare public Division: string | null;
}

InternalExamDepartment.init({
    InternalExamDepartmentID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    InternalExamID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    DepartmentID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    Division: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'ALL',
    }
}, {
    sequelize,
    modelName: 'InternalExamDepartment',
    tableName: 'InternalExamDepartments',
    timestamps: true,
});
