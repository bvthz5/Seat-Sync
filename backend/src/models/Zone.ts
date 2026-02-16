import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";
import { Room } from "./Room.js";

interface ZoneAttributes {
    ZoneID: number;
    RoomID: number;
    ZoneCode: string;
    ZoneName: string;
    Color: string;
}

interface ZoneCreationAttributes extends Optional<ZoneAttributes, "ZoneID"> { }

export class Zone extends Model<ZoneAttributes, ZoneCreationAttributes>
    implements ZoneAttributes {
    declare ZoneID: number;
    declare RoomID: number;
    declare ZoneCode: string;
    declare ZoneName: string;
    declare Color: string;
}

Zone.init(
    {
        ZoneID: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        RoomID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Rooms",
                key: "RoomID",
            },
        },
        ZoneCode: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        ZoneName: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        Color: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "Zones",
        timestamps: true,
    }
);

Zone.belongsTo(Room, {
    foreignKey: "RoomID",
    onDelete: "CASCADE",
});

Room.hasMany(Zone, {
    foreignKey: "RoomID",
});

export default Zone;
