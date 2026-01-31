import { Request, Response } from "express";
import Department from "../models/Department.js";

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll();
        res.json(departments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { DepartmentCode, DepartmentName } = req.body;
        const newDepartment = await Department.create({
            DepartmentCode,
            DepartmentName,
        });
        res.status(201).json(newDepartment);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { DepartmentCode, DepartmentName } = req.body;

        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        await department.update({ DepartmentCode, DepartmentName });
        res.json(department);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        await department.destroy();
        res.json({ message: "Department deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDepartmentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const department = await Department.findByPk(Number(id), {
            include: ["Faculties"]
        });

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }
        res.json(department);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
