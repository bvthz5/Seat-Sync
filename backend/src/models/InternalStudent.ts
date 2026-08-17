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
    RollNumber: number | null;
    FullName: string;
    DepartmentID: number | null;
    ProgramID: number | null;
    SemesterID: number | null;
    Programme: string | null;
    Branch: string | null;
    NormalizedBranch: string | null;
    Batch: string | null;
    BatchStart: number | null;
    BatchEnd: number | null;
    Division: string | null;
    Semester: string | null;
    BatchYear: number | null;
    AcademicYear: string | null;
    Status: string;
    Source: "Self Registered" | "Admin Added" | "Imported";
    createdAt?: Date;
    updatedAt?: Date;
}

interface InternalStudentCreationAttributes
    extends Optional<InternalStudentAttributes,
        "InternalStudentID" | "UserID" | "RollNumber" | "Programme" | "Branch" | "NormalizedBranch" | "Batch" | "BatchStart" | "BatchEnd" | "Division" | "Semester" | "Source" | "Status" | "DepartmentID" | "ProgramID" | "SemesterID" | "BatchYear" | "AcademicYear"
    > {}

export class InternalStudent extends Model<InternalStudentAttributes, InternalStudentCreationAttributes>
    implements InternalStudentAttributes {
    declare InternalStudentID: number;
    declare UserID: number | null;
    declare RegisterNumber: string;
    declare RollNumber: number | null;
    declare FullName: string;
    declare DepartmentID: number | null;
    declare ProgramID: number | null;
    declare SemesterID: number | null;
    declare Programme: string | null;
    declare Branch: string | null;
    declare NormalizedBranch: string | null;
    declare Batch: string | null;
    declare BatchStart: number | null;
    declare BatchEnd: number | null;
    declare Division: string | null;
    declare Semester: string | null;
    declare BatchYear: number | null;
    declare AcademicYear: string | null;
    declare Status: string;
    declare Source: "Self Registered" | "Admin Added" | "Imported";
    declare createdAt: Date;
    declare updatedAt: Date;

    // Associations
    declare Department?: any;
    declare Program?: any;
    declare SemesterModel?: any;
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
        RollNumber: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
        Programme: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        Branch: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        NormalizedBranch: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        Batch: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        BatchStart: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        BatchEnd: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        Division: {
            type: DataTypes.STRING(10),
            allowNull: true,
            defaultValue: null,
        },
        Semester: {
            type: DataTypes.STRING(20),
            allowNull: true,
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
        createdAt: {
            type: DataTypes.DATE,
            field: "createdAt",
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: "updatedAt",
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
            { fields: ["Programme", "NormalizedBranch", "Semester"] },
            { fields: ["Batch", "Division", "Semester", "RollNumber"] },
        ],
    }
);

export default InternalStudent;
