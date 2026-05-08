import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export class InternalExamDepartment extends Model {
    declare public InternalExamDepartmentID: number;
    declare public InternalExamID: number;
    declare public DepartmentID: number;
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
    }
}, {
    sequelize,
    modelName: 'InternalExamDepartment',
    tableName: 'InternalExamDepartments',
    timestamps: true,
});
