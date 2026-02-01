import { Request, Response } from "express";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import { sequelize } from "../config/database.js";

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll();
        // TODO: Re-implement student count efficiently. 
        // The previous literal subquery caused aliasing issues.
        res.json(departments);
    } catch (error: any) {
        console.error("Error fetching departments:", error);
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

        const department = await Department.findByPk(id as string);
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
        const department = await Department.findByPk(id as string);
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
            include: ["Faculties"],
            // attributes include removed temporarily
        });

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }
        res.json(department);
    } catch (error: any) {
        console.error("Error fetching department by ID:", error);
        res.status(500).json({ message: error.message });
    }
};
