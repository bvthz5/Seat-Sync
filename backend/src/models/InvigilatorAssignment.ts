import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Exam } from "./Exam.js";
import { Room } from "./Room.js";
import { Invigilator } from "./Invigilator.js";

/**
 * InvigilatorAssignment table attributes
 */
interface InvigilatorAssignmentAttributes {
  ExamID: number;
  RoomID: number;
  InvigilatorID: number;
}

export class InvigilatorAssignment extends Model<InvigilatorAssignmentAttributes>
  implements InvigilatorAssignmentAttributes {
  declare ExamID: number;
  declare RoomID: number;
  declare InvigilatorID: number;
}

InvigilatorAssignment.init(
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
    RoomID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Rooms",
        key: "RoomID",
      },
    },
    InvigilatorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Invigilators",
        key: "InvigilatorID",
      },
    },
  },
  {
    sequelize,
    tableName: "InvigilatorAssignments",
    timestamps: false,
  }
);

/**
 * Associations
 */
InvigilatorAssignment.belongsTo(Exam, {
  foreignKey: "ExamID",
});

Exam.hasMany(InvigilatorAssignment, {
  foreignKey: "ExamID",
});

InvigilatorAssignment.belongsTo(Room, {
  foreignKey: "RoomID",
});

Room.hasMany(InvigilatorAssignment, {
  foreignKey: "RoomID",
});

InvigilatorAssignment.belongsTo(Invigilator, {
  foreignKey: "InvigilatorID",
});

Invigilator.hasMany(InvigilatorAssignment, {
  foreignKey: "InvigilatorID",
});

export default InvigilatorAssignment;