import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

interface InternalSubjectEligibilityAttributes {
    InternalSubjectEligibilityID: number;
    SubjectCode: string;
    SubjectName: string | null;
    SubjectPseudoRoll: string | null;
    AdmissionNumber: string;
    StudentName: string | null;
    InternalStudentID: number | null;
    SourceFile: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface InternalSubjectEligibilityCreationAttributes
    extends Optional<InternalSubjectEligibilityAttributes,
        "InternalSubjectEligibilityID" | "SubjectName" | "SubjectPseudoRoll" | "StudentName" | "InternalStudentID" | "SourceFile"
    > {}

export class InternalSubjectEligibility extends Model<InternalSubjectEligibilityAttributes, InternalSubjectEligibilityCreationAttributes>
    implements InternalSubjectEligibilityAttributes {
    declare InternalSubjectEligibilityID: number;
    declare SubjectCode: string;
    declare SubjectName: string | null;
    declare SubjectPseudoRoll: string | null;
    declare AdmissionNumber: string;
    declare StudentName: string | null;
    declare InternalStudentID: number | null;
    declare SourceFile: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;

    declare Student?: any;
}

InternalSubjectEligibility.init(
    {
        InternalSubjectEligibilityID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        SubjectCode: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        SubjectName: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        SubjectPseudoRoll: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        AdmissionNumber: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        StudentName: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        InternalStudentID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "InternalStudents", key: "InternalStudentID" },
        },
        SourceFile: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "InternalSubjectEligibilities",
        timestamps: true,
        indexes: [
            { name: "idx_subj_elig_code_adm", unique: true, fields: ["SubjectCode", "AdmissionNumber"] },
            { name: "idx_subj_elig_code", fields: ["SubjectCode"] },
            { name: "idx_subj_elig_student", fields: ["InternalStudentID"] },
        ],
    }
);

export default InternalSubjectEligibility;
