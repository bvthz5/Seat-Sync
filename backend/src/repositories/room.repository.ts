import { Room } from "../models/Room.js";
import { Block } from "../models/Block.js";
import { Floor } from "../models/Floor.js";
import { sequelize } from "../config/database.js";
import { Transaction, Op } from "sequelize";

export class RoomRepository {
    async findByLocation(blockId: number, floorId: number, options: { page?: number, limit?: number, search?: string, status?: string } = {}) {
        const { page = 1, limit = 10, search, status } = options;
        const offset = (page - 1) * limit;

        const whereClause: any = {
            BlockID: blockId,
            FloorID: floorId,
        };

        if (search) {
            whereClause.RoomCode = { [Op.like]: `%${search}%` };
        }
        if (status) {
            whereClause.Status = status;
        }

        return Room.findAndCountAll({
            where: whereClause,
            order: [['RoomCode', 'ASC']],
            limit,
            offset,
        });
    }

    async findByCode(roomCode: string, floorId: number) {
        if (!floorId) return null;
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
