import csv from 'csv-parser';
import { Readable } from 'stream';
import { sequelize } from '../config/database.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Program } from '../models/Program.js';
import { Semester } from '../models/Semester.js';
import bcrypt from 'bcrypt';
import { emailService } from './email.service.js';

interface StudentCSVRow {
    FullName?: string;
    RegisterNumber?: string;
    DepartmentCode?: string;
    ProgramName?: string;
    SemesterNumber?: string;
    Email?: string;
}

interface StudentImportResult {
    studentsCreated: number;
    usersCreated: number;
    successRows: number;
    failedRows: Array<{
        rowNumber: number;
        registerNumber?: string | undefined;
        error: string;
    }>;
}

export class BulkStudentImportService {
    private departmentCache = new Map<string, number>();
    private programCache = new Map<string, number>();
    private semesterCache = new Map<string, number>();
    private userCache = new Map<string, number>();

    async importFromCSV(fileBuffer: Buffer): Promise<StudentImportResult> {
        const rows: StudentCSVRow[] = [];

        // 1. Parse CSV
        await new Promise<void>((resolve, reject) => {
            const stream = Readable.from(fileBuffer);
            stream
                .pipe(csv())
                .on('data', (data) => rows.push(data))
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });

        if (rows.length === 0 || !rows[0]) {
            throw new Error("CSV file is empty");
        }

        // Validate Headers
        const requiredHeaders = ['FullName', 'RegisterNumber', 'DepartmentCode', 'ProgramName'];
        const headers = Object.keys(rows[0]);
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
        }

        const transaction = await sequelize.transaction();
        let studentsCreated = 0;
        let usersCreated = 0;
        const failedRows: StudentImportResult['failedRows'] = [];
        const processedRegNumbers = new Set<string>();
        
        // Track created students for email sending (after transaction commits)
        const createdStudentsForEmail: Array<{
            email: string;
            fullName: string;
            plainPassword: string;
            registerNumber: string;
        }> = [];

        try {
            // 2. Process Rows
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;

                const lineNum = i + 2; // +1 for 0-index, +1 for header
                
                try {
                    // Extract and validate row data
                    const fullName = row.FullName?.trim();
                    const registerNumber = row.RegisterNumber?.trim();
                    const departmentCode = row.DepartmentCode?.trim();
                    const programName = row.ProgramName?.trim();
                    const semesterNumber = row.SemesterNumber?.trim();
                    const email = row.Email?.trim();

                    // Row Validation
                    if (!fullName) {
                        throw new Error("FullName is required");
                    }
                    if (!registerNumber) {
                        throw new Error("RegisterNumber is required");
                    }
                    if (!departmentCode) {
                        throw new Error("DepartmentCode is required");
                    }
                    if (!programName) {
                        throw new Error("ProgramName is required");
                    }

                    // Check for duplicates within file
                    if (processedRegNumbers.has(registerNumber.toLowerCase())) {
                        throw new Error(`Duplicate RegisterNumber '${registerNumber}' in CSV`);
                    }
                    processedRegNumbers.add(registerNumber.toLowerCase());

                    // Check if student already exists in DB
                    const existingStudent = await Student.findOne({
                        where: { RegisterNumber: registerNumber },
                        transaction
                    });
                    if (existingStudent) {
                        throw new Error(`Student with RegisterNumber '${registerNumber}' already exists`);
                    }

                    // Get Department
                    let deptId = this.departmentCache.get(departmentCode.toLowerCase());
                    if (!deptId) {
                        const dept = await Department.findOne({
                            where: { DepartmentCode: departmentCode },
                            transaction
                        });
                        if (!dept) {
                            throw new Error(`Department with code '${departmentCode}' not found`);
                        }
                        deptId = dept.DepartmentID;
                        this.departmentCache.set(departmentCode.toLowerCase(), deptId);
                    }

                    // Get Program
                    let progId = this.programCache.get(programName.toLowerCase());
                    if (!progId) {
                        const program = await Program.findOne({
                            where: { ProgramName: programName },
                            transaction
                        });
                        if (!program) {
                            throw new Error(`Program with name '${programName}' not found`);
                        }
                        progId = program.ProgramID;
                        this.programCache.set(programName.toLowerCase(), progId);
                    }

                    // Get or Create Semester
                    let semId: number;
                    if (semesterNumber && !isNaN(parseInt(semesterNumber))) {
                        const semKey = `${progId}-${semesterNumber}`;
                        semId = this.semesterCache.get(semKey) || 0;
                        if (!semId) {
                            let semester = await Semester.findOne({
                                where: {
                                    ProgramID: progId,
                                    SemesterNumber: parseInt(semesterNumber)
                                },
                                transaction
                            });
                            if (!semester) {
                                semester = await Semester.create({
                                    ProgramID: progId,
                                    SemesterNumber: parseInt(semesterNumber),
                                    SemesterName: `S${semesterNumber}`,
                                    IsActive: true
                                }, { transaction });
                            }
                            semId = semester.SemesterID;
                            this.semesterCache.set(semKey, semId);
                        }
                    } else {
                        // Get default semester (first semester)
                        let semester = await Semester.findOne({
                            where: { ProgramID: progId, SemesterNumber: 1 },
                            transaction
                        });
                        if (!semester) {
                            semester = await Semester.create({
                                ProgramID: progId,
                                SemesterNumber: 1,
                                SemesterName: 'S1',
                                IsActive: true
                            }, { transaction });
                        }
                        semId = semester.SemesterID;
                    }

                    // Create or Get User
                    const userEmail = email || registerNumber;
                    let userId = this.userCache.get(userEmail.toLowerCase());
                    let plainPassword: string | null = null;
                    
                    if (!userId) {
                        let user = await User.findOne({
                            where: { Email: userEmail },
                            transaction
                        });

                        if (!user) {
                            // Generate default password: first 4 chars of name + @123
                            plainPassword = fullName.replace(/\s/g, '').substring(0, 4) + '@123';
                            const passwordHash = await bcrypt.hash(plainPassword, 10);

                            user = await User.create({
                                Email: userEmail,
                                FullName: fullName,
                                PasswordHash: passwordHash,
                                Role: 'student',
                                IsRootAdmin: false
                            }, { transaction });
                            usersCreated++;
                        } else {
                            // Update FullName if user exists
                            if (fullName && !user.FullName) {
                                await user.update({ FullName: fullName }, { transaction });
                            }
                        }

                        userId = user.UserID;
                        this.userCache.set(userEmail.toLowerCase(), userId);
                    }

                    // Create Student
                    await Student.create({
                        UserID: userId,
                        RegisterNumber: registerNumber,
                        DepartmentID: deptId,
                        ProgramID: progId,
                        SemesterID: semId,
                        BatchYear: new Date().getFullYear()
                    }, { transaction });

                    studentsCreated++;
                    
                    // Track for email sending (only if new user was created and has email)
                    if (plainPassword && email) {
                        createdStudentsForEmail.push({
                            email: userEmail,
                            fullName,
                            plainPassword,
                            registerNumber
                        });
                    }

                } catch (error: any) {
                    failedRows.push({
                        rowNumber: lineNum,
                        registerNumber: row.RegisterNumber || undefined,
                        error: error.message || 'Unknown error'
                    });
                }
            }

            // Check if all rows failed
            if (studentsCreated === 0 && failedRows.length > 0) {
                await transaction.rollback();
                throw new Error(
                    `All rows failed to import. First error: ${failedRows[0]?.error || 'Unknown error'}`
                );
            }

            await transaction.commit();
            
            // Send credential emails asynchronously after successful transaction
            createdStudentsForEmail.forEach(student => {
                emailService.sendStudentCredentialsEmail(
                    student.email,
                    student.fullName,
                    student.email,
                    student.plainPassword,
                    student.registerNumber
                ).catch((err: any) => console.error(`Failed to send email to ${student.email}:`, err.message));
            });

            return {
                studentsCreated,
                usersCreated,
                successRows: studentsCreated,
                failedRows
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Import with optional batch seat allocation
     * Allocates seats from a specific batch/rotation
     */
    async importWithSeatAllocation(
        fileBuffer: Buffer,
        blockId: number,
        floorId: number,
        roomId: number,
        batchNumber: number
    ): Promise<StudentImportResult & { seatsAllocated: number }> {
        const result = await this.importFromCSV(fileBuffer);
        
        // TODO: Implement seat allocation for created students
        // This would involve:
        // 1. Get all seats in the room with status = 'Available'
        // 2. Allocate seats sequentially to newly created students
        // 3. Mark seats as 'Occupied' and update SeatAllocation records

        return {
            ...result,
            seatsAllocated: 0
        };
    }

    /**
     * Clear caches (useful when processing multiple files)
     */
    clearCaches(): void {
        this.departmentCache.clear();
        this.programCache.clear();
        this.semesterCache.clear();
        this.userCache.clear();
    }
}
