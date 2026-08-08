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
    RegistrationMethod?: "AUTO" | "EXCEL" | "MANUAL";
}

export class InternalExamRegistration extends Model<InternalExamRegistrationAttributes>
    implements InternalExamRegistrationAttributes {
    declare InternalExamRegistrationID: number;
    declare InternalExamID: number;
    declare InternalStudentID: number;
    declare RegistrationMethod: "AUTO" | "EXCEL" | "MANUAL";
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
        RegistrationMethod: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "AUTO",
        },
    },
    {
        sequelize,
        tableName: "InternalExamRegistrations",
        timestamps: true,
        indexes: [
            { name: "idx_int_exam_reg_unique", unique: true, fields: ["InternalExamID", "InternalStudentID"] },
            { name: "idx_int_exam_reg_student", fields: ["InternalStudentID"] },
        ],
    }
);

export default InternalExamRegistration;
