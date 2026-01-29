
import { Request, Response } from "express";
import { Subject } from "../models/Subject.js";
import { Op } from "sequelize";

export const getSubjects = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string;
        const whereClause: any = {};

        if (search) {
            whereClause[Op.or] = [
                { SubjectName: { [Op.like]: `%${search}%` } },
                { SubjectCode: { [Op.like]: `%${search}%` } }
            ];
        }

        const subjects = await Subject.findAll({
            where: whereClause,
            order: [['SubjectName', 'ASC']]
        });

        res.json(subjects);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
