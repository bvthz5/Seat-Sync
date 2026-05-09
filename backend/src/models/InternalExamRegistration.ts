import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * InternalExamRegistration — Maps InternalStudents to InternalExams.
 * NO eligibility logic. If a student is in this table, they ARE appearing for that exam.
 * This is populated during bulk student import for internal exams.
 */
interface InternalExamRegistrationAttributes {
    InternalExamRegistrationID: number;
    InternalExamID: number;
    InternalStudentID: number;
}

export class InternalExamRegistration extends Model<InternalExamRegistrationAttributes>
    implements InternalExamRegistrationAttributes {
    declare InternalExamRegistrationID: number;
    declare InternalExamID: number;
    declare InternalStudentID: number;
    declare Student?: any;
}

InternalExamRegistration.init(
    {
        InternalExamRegistrationID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        InternalExamID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "InternalExams", key: "InternalExamID" },
        },
        InternalStudentID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "InternalStudents", key: "InternalStudentID" },
        },
    },
    {
        sequelize,
        tableName: "InternalExamRegistrations",
        timestamps: true,
        indexes: [
            { unique: true, fields: ["InternalExamID", "InternalStudentID"] },
            { fields: ["InternalStudentID"] },
        ],
    }
);

export default InternalExamRegistration;
