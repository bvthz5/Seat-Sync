import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * InternalSeatAllocation — Seat assignments for Internal Exams.
 * Completely isolated from EndSem SeatAllocations.
 * References InternalExams, InternalSeats, and InternalStudents.
 */
interface InternalSeatAllocationAttributes {
    InternalSeatAllocationID: number;
    InternalExamID: number;
    InternalSeatID: number;
    InternalStudentID: number;
}

export class InternalSeatAllocation extends Model<InternalSeatAllocationAttributes>
    implements InternalSeatAllocationAttributes {
    declare InternalSeatAllocationID: number;
    declare InternalExamID: number;
    declare InternalSeatID: number;
    declare InternalStudentID: number;
    declare Student?: any;
    declare Exam?: any;
    declare Seat?: any;
}

InternalSeatAllocation.init(
    {
        InternalSeatAllocationID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        InternalExamID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "InternalExams", key: "InternalExamID" },
        },
        InternalSeatID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "InternalSeats", key: "SeatID" },
        },
        InternalStudentID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "InternalStudents", key: "InternalStudentID" },
        },
    },
    {
        sequelize,
        tableName: "InternalSeatAllocations",
        timestamps: false,
        indexes: [
            { name: "idx_int_seat_alloc_unique", unique: true, fields: ["InternalExamID", "InternalSeatID"] },
            { name: "idx_int_seat_alloc_student", fields: ["InternalStudentID"] },
        ],
    }
);

export default InternalSeatAllocation;
