import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * InternalStudent — Completely isolated from EndSem Students table.
 * Stores students who appear for Internal Exams only.
 * Same RegisterNumber CAN exist in both InternalStudents and Students (EndSem).
 */
interface InternalStudentAttributes {
    InternalStudentID: number;
    UserID: number | null;
    RegisterNumber: string;
    FullName: string;
    DepartmentID: number | null;
    ProgramID: number | null;
    SemesterID: number | null;
    BatchYear: number | null;
    AcademicYear: string | null;
    Status: "ACTIVE" | "GRADUATED" | "DROPPED";
    Source: "Self Registered" | "Admin Added" | "Imported";
}

interface InternalStudentCreationAttributes
    extends Optional<InternalStudentAttributes,
        "InternalStudentID" | "UserID" | "Status" | "Source" | "DepartmentID" | "ProgramID" | "SemesterID" | "BatchYear" | "AcademicYear"
    > {}

export class InternalStudent extends Model<InternalStudentAttributes, InternalStudentCreationAttributes>
    implements InternalStudentAttributes {
    declare InternalStudentID: number;
    declare UserID: number | null;
    declare RegisterNumber: string;
    declare FullName: string;
    declare DepartmentID: number | null;
    declare ProgramID: number | null;
    declare SemesterID: number | null;
    declare BatchYear: number | null;
    declare AcademicYear: string | null;
    declare Status: "ACTIVE" | "GRADUATED" | "DROPPED";
    declare Source: "Self Registered" | "Admin Added" | "Imported";

    // Associations
    declare Department?: any;
    declare Program?: any;
    declare Semester?: any;
    declare User?: any;
}

InternalStudent.init(
    {
        InternalStudentID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        UserID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Users", key: "UserID" },
        },
        RegisterNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        FullName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            defaultValue: "",
        },
        DepartmentID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Departments", key: "DepartmentID" },
        },
        ProgramID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Programs", key: "ProgramID" },
        },
        SemesterID: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "Semesters", key: "SemesterID" },
        },
        BatchYear: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        AcademicYear: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        Status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "ACTIVE",
            validate: { isIn: [["ACTIVE", "GRADUATED", "DROPPED"]] },
        },
        Source: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: "Imported",
            validate: { isIn: [["Self Registered", "Admin Added", "Imported"]] },
        },
    },
    {
        sequelize,
        tableName: "InternalStudents",
        timestamps: true,
        indexes: [
            { fields: ["RegisterNumber"] },
            { fields: ["DepartmentID"] },
            { fields: ["BatchYear"] },
        ],
    }
);

export default InternalStudent;
