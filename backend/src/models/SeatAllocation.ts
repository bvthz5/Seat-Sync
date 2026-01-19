import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Exam } from "./Exam.js";
import { Seat } from "./Seat.js";
import { Student } from "./Student.js";

/**
 * SeatAllocation table attributes
 */
interface SeatAllocationAttributes {
  ExamID: number;
  SeatID: number;
  StudentID: number;
}

export class SeatAllocation extends Model<SeatAllocationAttributes>
  implements SeatAllocationAttributes {
  declare ExamID: number;
  declare SeatID: number;
  declare StudentID: number;
}

SeatAllocation.init(
  {
    ExamID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Exams",
        key: "ExamID",
      },
    },
    SeatID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Seats",
        key: "SeatID",
      },
    },
    StudentID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Students",
        key: "StudentID",
      },
    },
  },
  {
    sequelize,
    tableName: "SeatAllocations",
    timestamps: false,
  }
);

/**
 * Associations
 */
SeatAllocation.belongsTo(Exam, {
  foreignKey: "ExamID",
});

Exam.hasMany(SeatAllocation, {
  foreignKey: "ExamID",
});

SeatAllocation.belongsTo(Seat, {
  foreignKey: "SeatID",
});

Seat.hasMany(SeatAllocation, {
  foreignKey: "SeatID",
});

SeatAllocation.belongsTo(Student, {
  foreignKey: "StudentID",
});

Student.hasMany(SeatAllocation, {
  foreignKey: "StudentID",
});

export default SeatAllocation;