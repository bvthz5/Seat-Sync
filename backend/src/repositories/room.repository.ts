import { Room } from "../models/Room.js";
import { Block } from "../models/Block.js";
import { Floor } from "../models/Floor.js";
import { sequelize } from "../config/database.js";
import { Transaction } from "sequelize";

export class RoomRepository {
    async findByLocation(blockId: number, floorId: number) {
        return Room.findAll({
            where: {
                BlockID: blockId,
                FloorID: floorId,
            },
            include: [
                { model: Block, attributes: ["BlockName"] },
                { model: Floor, attributes: ["FloorNumber"] },
            ],
            order: [["RoomCode", "ASC"]],
        });
    }

    async findByCode(roomCode: string, floorId: number) {
        return Room.findOne({
            where: {
                RoomCode: roomCode,
                FloorID: floorId,
            },
        });
    }

    async findById(roomId: number) {
        return Room.findByPk(roomId);
    }

    async create(data: any, transaction?: Transaction) {
        return Room.create(data, { transaction: transaction ?? null });
    }

    async bulkCreate(data: any[], transaction?: Transaction) {
        return Room.bulkCreate(data, {
            transaction: transaction ?? null,
            validate: true
        });
    }

    async update(roomId: number, data: any, transaction?: Transaction) {
        return Room.update(data, {
            where: { RoomID: roomId },
            transaction: transaction ?? null,
        });
    }

    async countByFloor(floorId: number) {
        return Room.count({ where: { FloorID: floorId } });
    }
}
