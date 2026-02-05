
import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';

// Get all users who are Students
export const getStudentUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;

        const where: any = { Role: 'student' };
        if (search) {
            where[Op.or] = [
                { FullName: { [Op.like]: `%${search}%` } },
                { Email: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['UserID', 'FullName', 'Email', 'IsActive', 'CreatedAt'],
            limit,
            offset: (page - 1) * limit,
            order: [['CreatedAt', 'DESC']]
        });

        // Check which ones are "Orphaned" (No corresponding Student record)
        // We could do this with an include, but checking existence is enough
        // Ideally we do a LEFT OUTER JOIN
        // Let's do a quick separate check for the visible page rows
        const userIds = rows.map(u => u.UserID);
        const linkedStudents = await Student.findAll({
            where: { UserID: userIds },
            attributes: ['UserID']
        });
        const linkedUserIds = new Set(linkedStudents.map(s => s.UserID));

        const usersWithStatus = rows.map(u => ({
            ...u.toJSON(),
            isOrphaned: !linkedUserIds.has(u.UserID)
        }));

        res.json({
            users: usersWithStatus,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });

    } catch (error: any) {
        console.error("Get Student Users Error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

// Delete a single user
export const deleteUser = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        await User.destroy({ where: { UserID: id }, transaction: t });
        await t.commit();
        res.json({ message: "User deleted successfully" });
    } catch (error: any) {
        await t.rollback();
        console.error("Delete User Error:", error);
        res.status(500).json({ message: "Failed to delete user" });
    }
};

// Bulk delete all student users
export const deleteAllStudentUsers = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        // Only delete users with Role 'student'. Extra safety.
        const result = await User.destroy({
            where: { Role: 'student' },
            transaction: t
        });
        await t.commit();
        res.json({ message: `Successfully deleted ${result} student user accounts.` });
    } catch (error: any) {
        await t.rollback();
        console.error("Bulk Delete User Error:", error);
        res.status(500).json({ message: "Failed to delete users" });
    }
};
