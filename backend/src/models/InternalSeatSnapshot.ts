import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * InternalSeatSnapshot — Record of a generated seating arrangement.
 */
interface InternalSeatSnapshotAttributes {
    SnapshotID: number;
    Title: string;
    Session: string;
    ExamDate: string;
    SeriesID: number;
    CreatedAt?: Date;
}

interface InternalSeatSnapshotCreationAttributes
    extends Optional<InternalSeatSnapshotAttributes, "SnapshotID" | "CreatedAt"> {}

export class InternalSeatSnapshot extends Model<InternalSeatSnapshotAttributes, InternalSeatSnapshotCreationAttributes>
    implements InternalSeatSnapshotAttributes {
    declare SnapshotID: number;
    declare Title: string;
    declare Session: string;
    declare ExamDate: string;
    declare SeriesID: number;
    declare readonly CreatedAt: Date;
}

InternalSeatSnapshot.init(
    {
        SnapshotID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        Title: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        Session: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        ExamDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        SeriesID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "InternalExamSeries", key: "InternalExamSeriesID" },
        },
        createdAt: {
            type: DataTypes.DATE,
            field: "createdAt",
        },
    },
    {
        sequelize,
        tableName: "InternalSeatSnapshots",
        timestamps: true,
        updatedAt: false,
    }
);
