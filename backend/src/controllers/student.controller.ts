import { Request, Response } from 'express';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Program } from '../models/Program.js';
import { Semester } from '../models/Semester.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';

export const getAllStudents = async (req: Request, res: Response) => {
    try {
        console.log("Fetching students params:", req.query);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search as string;
        const dept = req.query.dept as string; // DepartmentID
        const program = req.query.program as string; // ProgramID
        const semester = req.query.semester as string; // SemesterID

        const studentWhere: any = {};
        const userWhere: any = {};

        // Filter by Department, Program, Semester
        if (dept) studentWhere.DepartmentID = dept;
        if (program) studentWhere.ProgramID = program;
        if (semester) studentWhere.SemesterID = semester;

        // Search Logic
        if (search) {
            // we want to search in Student.RegisterNumber OR User.FullName OR User.Email
            // Since we are doing an include, we can't easily do a top-level OR across tables without complex queries.
            // A common strategy:
            // 1. Where on Student fields OR
            // 2. Where on User fields

            // However, typical Sequelize "include" with "where" performs an inner join.
            // If we put a where on User, it filters students who have that user.

            // Simpler approach for single search bar across related tables:
            // Use logical OR in the main where clause if possible, but that's hard with associations.
            // Alternatively, utilize the fact that we can search User fields in the User include, and Student fields in the Student where.
            // But we want (Student matches OR User matches).

            // Let's try:
            // Find User IDs that match Name/Email
            // OR find Student that matches RegNo

            // Constructing a smart where clause:
            // This is slightly complex in pure Sequelize object syntax without literal.
            // Let's stick to a solid implementation:

            // Allow searching by Register Number regardless of User
            if (!isNaN(Number(search))) {
                // heuristic: if sure it's a number, maybe it's RegNo (if numeric) or Batch
            }

            // Simplest robust way for "Search All" in this stack:
            // User 'Where' clause handles Name/Email. 
            // Student 'Where' clause handles RegisterNumber.
            // BUT they are ANDed by default (Student must match AND User must match).
            // We want Union.

            // WORKAROUND:
            // We can search for the Search Term in RegisterNumber. 
            // OR we can search in User.
            // Since we usually want to filter the LIST of students.

            // Let's simplify: 
            // If the search term matches RegisterNumber, we find those students.
            // If it matches Name/Email, we find those students.

            // We can use Sequelize's "$" syntax for nested columns if supported, or just keep it simple:
            // We will filter users who match Name/Email.
            // AND/OR we filter students who match RegNo.

            // Let's prioritize: 
            // if search is provided, we try to match RegisterNumber OR User fields.
            // Since standard includes are AND, checking "RegisterNumber LIKE %q% OR User.Name LIKE %q%" requires top level where with '$User.FullName$'.

            studentWhere[Op.or] = [
                { RegisterNumber: { [Op.like]: `%${search}%` } },
                { '$User.FullName$': { [Op.like]: `%${search}%` } },
                { '$User.Email$': { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Student.findAndCountAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    attributes: ['Email', 'Role', 'FullName'],
                    // where: userWhere, // We are doing the search in the top level where using $User.field$ syntax
                    required: true // Inner join required for the $User.field$ syntax to work reliably for filtering
                },
                { model: Department, attributes: ['DepartmentName', 'DepartmentCode'] },
                { model: Program, attributes: ['ProgramName'] },
                { model: Semester, attributes: ['SemesterNumber'] }
            ],
            limit,
            offset,
            order: [['StudentID', 'ASC']]
            // subQuery: false // Required for $Association$ where clauses with limits to work correctly often
        });

        // Note: findAndCountAll with include + limit + where on include sometimes counts wrong or fails. 
        // We might need `subQuery: false` if we are filtering by associated columns?
        // Actually, with standard limit/offset, Sequelize tries to be smart.
        // Let's verify if $User.FullName$ works. It generally implies subQuery: false is needed if 1:N but 1:1 is easier.
        // Student->User is 1:1.

        res.json({
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            students: rows
        });
    } catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const exportStudents = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string;
        const dept = req.query.dept as string;
        const program = req.query.program as string;
        const semester = req.query.semester as string;

        const studentWhere: any = {};
        if (dept) studentWhere.DepartmentID = dept;
        if (program) studentWhere.ProgramID = program;
        if (semester) studentWhere.SemesterID = semester;

        // Search Logic (same as getAllStudents)
        if (search) {
            studentWhere[Op.or] = [
                { RegisterNumber: { [Op.like]: `%${search}%` } },
                { '$User.FullName$': { [Op.like]: `%${search}%` } },
                { '$User.Email$': { [Op.like]: `%${search}%` } }
            ];
        }

        const students = await Student.findAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    attributes: ['Email', 'FullName'],
                    required: true
                },
                { model: Department, attributes: ['DepartmentName'] },
                { model: Program, attributes: ['ProgramName'] },
                { model: Semester, attributes: ['SemesterNumber'] }
            ],
            order: [['RegisterNumber', 'ASC']]
        });

        // Transform for Excel
        const data = students.map((s: any) => ({
            'Register Number': s.RegisterNumber,
            'Name': s.User?.FullName,
            'Email': s.User?.Email,
            'Department': s.Department?.DepartmentName,
            'Program': s.Program?.ProgramName,
            'Semester': s.Semester?.SemesterNumber,
            'Batch Year': s.BatchYear
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
        res.send(buffer);

    } catch (error) {
        console.error("Error exporting students:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const importStudents = async (req: Request, res: Response) => {
    // Expected Excel Columns: Name, Email, RegisterNumber, DepartmentCode, ProgramName, SemesterNumber, BatchYear
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const t = await sequelize.transaction();

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Excel file: No sheets found" });
        }
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid Excel file: Sheet data missing" });
        }
        const data: any[] = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errors: string[] = [];

        for (const row of data) {
            try {
                // 1. Validation basics
                if (!row.Email || !row.RegisterNumber || !row.DepartmentCode) {
                    throw new Error(`Missing required fields for ${row.RegisterNumber || 'Unknown'}`);
                }

                // 2. Find/Create User
                // Default Password: First 4 chars of Name + @123 ?? or just 'SeatSync@123'
                const defaultPassword = await bcrypt.hash('SeatSync@123', 10);

                let user = await User.findOne({ where: { Email: row.Email }, transaction: t });
                if (!user) {
                    user = await User.create({
                        Email: row.Email,
                        FullName: row.Name || null,
                        PasswordHash: defaultPassword,
                        Role: 'student',
                        IsRootAdmin: false
                    }, { transaction: t });
                } else {
                    // Update name if missing
                    if (!user.FullName && row.Name) {
                        await user.update({ FullName: row.Name }, { transaction: t });
                    }
                }

                // 3. Resolve Relations
                const department = await Department.findOne({ where: { DepartmentCode: row.DepartmentCode }, transaction: t });
                if (!department) throw new Error(`Department Code ${row.DepartmentCode} not found`);

                const program = await Program.findOne({ where: { ProgramName: row.ProgramName }, transaction: t });
                if (!program) throw new Error(`Program ${row.ProgramName} not found`);

                const semester = await Semester.findOne({
                    where: { SemesterNumber: row.SemesterNumber, ProgramID: program.ProgramID },
                    transaction: t
                });

                if (!semester) throw new Error(`Semester ${row.SemesterNumber} not found for Program ${row.ProgramName}`);

                // 4. Create/Update Student
                const existingStudent = await Student.findOne({ where: { RegisterNumber: row.RegisterNumber }, transaction: t });

                if (existingStudent) {
                    await existingStudent.update({
                        UserID: user.UserID,
                        DepartmentID: department.DepartmentID,
                        ProgramID: program.ProgramID,
                        SemesterID: semester.SemesterID,
                        BatchYear: row.BatchYear
                    }, { transaction: t });
                } else {
                    await Student.create({
                        UserID: user.UserID,
                        RegisterNumber: row.RegisterNumber,
                        DepartmentID: department.DepartmentID,
                        ProgramID: program.ProgramID,
                        SemesterID: semester.SemesterID,
                        BatchYear: row.BatchYear
                    }, { transaction: t });
                }

                successCount++;
            } catch (err: any) {
                errors.push(`Row error (${row.RegisterNumber}): ${err.message}`);
            }
        }

        await t.commit();

        res.status(200).json({
            message: "Import processing complete",
            successCount,
            errorCount: errors.length,
            errors
        });

    } catch (error: any) {
        await t.rollback();
        console.error("Bulk Import Error:", error);
        res.status(500).json({ message: "Internal server error during import", error: error.message });
    }
};

export const createStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { FullName, Email, RegisterNumber, DepartmentID, ProgramID, SemesterID, BatchYear } = req.body;

        // Basic validation
        if (!FullName || !Email || !RegisterNumber || !DepartmentID || !ProgramID || !SemesterID || !BatchYear) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check for existing user
        let user = await User.findOne({ where: { Email }, transaction: t });
        if (!user) {
            const defaultPassword = await bcrypt.hash('SeatSync@123', 10);
            user = await User.create({
                Email,
                FullName,
                PasswordHash: defaultPassword,
                Role: 'student',
                IsRootAdmin: false
            }, { transaction: t });
        } else {
            // Optional: Update name if provided? Let's assume we maintain existing user details primarily but update name if null
            if (!user.FullName) {
                await user.update({ FullName }, { transaction: t });
            }
        }

        // Check for existing student profile
        const existingStudent = await Student.findOne({ where: { RegisterNumber }, transaction: t });
        if (existingStudent) {
            await t.rollback();
            return res.status(409).json({ message: "Student with this Register Number already exists" });
        }

        // Create Student
        const newStudent = await Student.create({
            UserID: user.UserID,
            RegisterNumber,
            DepartmentID,
            ProgramID,
            SemesterID,
            BatchYear
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: "Student created successfully", student: newStudent });

    } catch (error: any) {
        await t.rollback();
        console.error("Create Student Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


export const getCreateOptions = async (req: Request, res: Response) => {
    try {
        const departments = await Department.findAll({ attributes: ['DepartmentID', 'DepartmentCode', 'DepartmentName'] });
        const programs = await Program.findAll({ attributes: ['ProgramID', 'ProgramName'] });
        const semesters = await Semester.findAll({ attributes: ['SemesterID', 'SemesterNumber', 'ProgramID'] });

        res.json({
            departments,
            programs,
            semesters
        });
    } catch (error) {
        console.error("Error fetching create options:", error);
        res.status(500).json({ message: "Failed to fetch master data" });
    }
};

export const updateStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { FullName, Email, RegisterNumber, DepartmentID, ProgramID, SemesterID, BatchYear } = req.body;

        const student = await Student.findByPk(id as unknown as number, { transaction: t });
        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        const user = await User.findByPk(student.UserID, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "Associated user not found" });
        }

        // Update User
        if (Email || FullName) {
            await user.update({
                Email: Email || user.Email,
                FullName: FullName || user.FullName
            }, { transaction: t });
        }

        // Update Student
        await student.update({
            RegisterNumber: RegisterNumber || student.RegisterNumber,
            DepartmentID: DepartmentID || student.DepartmentID,
            ProgramID: ProgramID || student.ProgramID,
            SemesterID: SemesterID || student.SemesterID,
            BatchYear: BatchYear || student.BatchYear
        }, { transaction: t });

        await t.commit();
        res.json({ message: "Student updated successfully" });

    } catch (error: any) {
        await t.rollback();
        console.error("Update Student Error:", error);
        res.status(500).json({ message: "Failed to update student", error: error.message });
    }
};

export const deleteStudent = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const student = await Student.findByPk(id as unknown as number, { transaction: t });
        if (!student) {
            await t.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        const userId = student.UserID;

        // Delete Student first (foreign key constraint likely on UserID)
        await student.destroy({ transaction: t });

        // Delete User
        await User.destroy({ where: { UserID: userId }, transaction: t });

        await t.commit();
        res.json({ message: "Student deleted successfully" });

    } catch (error: any) {
        await t.rollback();
        console.error("Delete Student Error:", error);
        res.status(500).json({ message: "Failed to delete student", error: error.message });
    }
};

