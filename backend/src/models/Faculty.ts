import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

/**
 * Faculty table attributes
 */
interface FacultyAttributes {
    FacultyID: number;
    StaffCode?: string;
    Name: string;
    Designation: string;
    /** Plain-text department string imported from Excel */
    Department: string;
    ProfileImageURL?: string;
    IsEligible: boolean;
}

/**
 * Attributes required when creating a faculty
 */
interface FacultyCreationAttributes extends Optional<FacultyAttributes, "FacultyID" | "IsEligible" | "StaffCode"> { }

export class Faculty extends Model<FacultyAttributes, FacultyCreationAttributes>
    implements FacultyAttributes {
    declare FacultyID: number;
    declare StaffCode?: string;
    declare Name: string;
    declare Designation: string;
    declare Department: string;
    declare ProfileImageURL?: string;
    declare IsEligible: boolean;
}

Faculty.init(
    {
        FacultyID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        StaffCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
        },
        Name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        Designation: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        Department: {
            type: DataTypes.STRING(150),
            allowNull: false,
            defaultValue: "",
        },
        ProfileImageURL: {
            type: DataTypes.STRING(2048),
            allowNull: true,
        },
        IsEligible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: "Faculties",
        timestamps: false,
    }
);

export default Faculty;
