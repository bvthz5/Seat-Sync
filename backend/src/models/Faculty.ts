import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Department } from "./Department.js";

/**
 * Faculty table attributes
 */
interface FacultyAttributes {
    FacultyID: number;
    Name: string;
    Designation: string;
    ProfileImageURL?: string;
    IsEligible: boolean;
    DepartmentID: number;
}

/**
 * Attributes required when creating a faculty
 */
interface FacultyCreationAttributes extends Optional<FacultyAttributes, "FacultyID" | "IsEligible"> { }

export class Faculty extends Model<FacultyAttributes, FacultyCreationAttributes>
    implements FacultyAttributes {
    declare FacultyID: number;
    declare Name: string;
    declare Designation: string;
    declare ProfileImageURL?: string;
    declare IsEligible: boolean;
    declare DepartmentID: number;
    declare Department?: Department;
}

Faculty.init(
    {
        FacultyID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        Name: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        Designation: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        ProfileImageURL: {
            type: DataTypes.STRING(2048), // URL can be long
            allowNull: true,
        },
        IsEligible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        DepartmentID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Departments",
                key: "DepartmentID",
            },
        },
    },
    {
        sequelize,
        tableName: "Faculties",
        timestamps: false,
    }
);

/**
 * Associations
 */
Faculty.belongsTo(Department, {
    foreignKey: "DepartmentID",
});

export default Faculty;
