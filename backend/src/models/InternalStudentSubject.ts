import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export class InternalStudentSubject extends Model {
    declare public InternalStudentSubjectID: number;
    declare public InternalStudentID: number;
    declare public SubjectCode: string;
    declare public Semester: string | null;
    declare public EnrollmentType: string; // 'ELECTIVE' | 'MINOR' | 'HONOURS' | 'CORE'
    declare public createdAt: Date;
    declare public updatedAt: Date;
}

InternalStudentSubject.init({
    InternalStudentSubjectID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    InternalStudentID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'InternalStudents', key: 'InternalStudentID' },
    },
    SubjectCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    Semester: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    EnrollmentType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'ELECTIVE',
    },
    createdAt: {
        type: DataTypes.DATE,
        field: 'createdAt',
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: 'updatedAt',
    }
}, {
    sequelize,
    modelName: 'InternalStudentSubject',
    tableName: 'InternalStudentSubjects',
    timestamps: true,
    indexes: [
        { name: 'idx_int_stu_sub_unique', unique: true, fields: ['InternalStudentID', 'SubjectCode'] },
        { name: 'idx_int_stu_sub_code', fields: ['SubjectCode'] },
    ]
});

export default InternalStudentSubject;
