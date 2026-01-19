import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";
import { Invigilator } from "./Invigilator.js";
import { Subject } from "./Subject.js";

/**
 * InvigilatorSubject table attributes
 */
interface InvigilatorSubjectAttributes {
  InvigilatorID: number;
  SubjectID: number;
}

export class InvigilatorSubject extends Model<InvigilatorSubjectAttributes>
  implements InvigilatorSubjectAttributes {
  declare InvigilatorID: number;
  declare SubjectID: number;
}

InvigilatorSubject.init(
  {
    InvigilatorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Invigilators",
        key: "InvigilatorID",
      },
    },
    SubjectID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "Subjects",
        key: "SubjectID",
      },
    },
  },
  {
    sequelize,
    tableName: "InvigilatorSubjects",
    timestamps: false,
  }
);

/**
 * Associations
 */
Invigilator.belongsToMany(Subject, {
  through: InvigilatorSubject,
  foreignKey: "InvigilatorID",
  otherKey: "SubjectID",
});

Subject.belongsToMany(Invigilator, {
  through: InvigilatorSubject,
  foreignKey: "SubjectID",
  otherKey: "InvigilatorID",
});

export default InvigilatorSubject;