import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Exam } from "./Exam.js";
import { Room } from "./Room.js";
import { Faculty } from "./Faculty.js";

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
  declare Exam?: Exam;
  declare Room?: Room;
  declare Invigilator?: Faculty;
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
        model: "Faculties",
        key: "FacultyID",
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

InvigilatorAssignment.belongsTo(Faculty, {
  as: 'Invigilator',
  foreignKey: "InvigilatorID",
});

Faculty.hasMany(InvigilatorAssignment, {
  foreignKey: "InvigilatorID",
});

export default InvigilatorAssignment;