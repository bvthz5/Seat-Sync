import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export class InternalExam extends Model {
    declare public InternalExamID: number;
    declare public InternalExamSeriesID: number;
    declare public Semester: string;
    declare public Slot: string;
    declare public SubjectCode: string;
    declare public SubjectName: string;
    declare public ExamDate: Date;
    declare public Session: string;
    declare public Duration: number;
    declare public StartTime: string;
    declare public EndTime: string;
}

InternalExam.init({
    InternalExamID: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    InternalExamSeriesID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    Semester: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    Slot: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    SubjectCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    SubjectName: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    ExamDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    Session: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    Duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 150,
    },
    StartTime: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    EndTime: {
        type: DataTypes.STRING(15),
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'InternalExam',
    tableName: 'InternalExams',
    timestamps: true,
});
