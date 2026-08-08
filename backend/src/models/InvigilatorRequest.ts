import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "./User.js";

interface InvigilatorRequestAttributes {
  RequestID: number;
  FacultyID: string;
  Name: string;
  Email: string;
  Phone: string | null;
  Department: string;
  Designation: string | null;
  Reason: string | null;
  Status: "PENDING" | "APPROVED" | "REJECTED";
  RequestedAt: Date;
  ReviewedBy: number | null;
  ReviewedAt: Date | null;
}

interface InvigilatorRequestCreationAttributes extends Optional<InvigilatorRequestAttributes, "RequestID" | "Status" | "RequestedAt" | "ReviewedBy" | "ReviewedAt" | "Phone" | "Designation" | "Reason"> { }

export class InvigilatorRequest extends Model<InvigilatorRequestAttributes, InvigilatorRequestCreationAttributes> implements InvigilatorRequestAttributes {
  declare RequestID: number;
  declare FacultyID: string;
  declare Name: string;
  declare Email: string;
  declare Phone: string | null;
  declare Department: string;
  declare Designation: string | null;
  declare Reason: string | null;
  declare Status: "PENDING" | "APPROVED" | "REJECTED";
  declare RequestedAt: Date;
  declare ReviewedBy: number | null;
  declare ReviewedAt: Date | null;
}

InvigilatorRequest.init(
  {
    RequestID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    FacultyID: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    Name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    Email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    Phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    Department: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    Designation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    Reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "PENDING",
      validate: {
        isIn: [["PENDING", "APPROVED", "REJECTED"]]
      }
    },
    RequestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    ReviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "UserID",
      },
    },
    ReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "InvigilatorRequests",
    timestamps: false,
  }
);

InvigilatorRequest.belongsTo(User, {
  foreignKey: "ReviewedBy",
  as: "Reviewer",
});

export default InvigilatorRequest;
