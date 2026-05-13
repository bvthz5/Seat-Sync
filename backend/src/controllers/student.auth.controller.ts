import { Request, Response } from "express";
import { User } from "../models/User.js";
import { Student } from "../models/Student.js";
import { Semester } from "../models/Semester.js";
import { Program } from "../models/Program.js";
import { ProgramDepartment } from "../models/ProgramDepartment.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { JWTPayload } from "../interfaces/auth.interfaces.js";
import { generateRandomToken, hashToken } from "../utils/hash.js";
import { PasswordReset } from "../models/PasswordReset.model.js";
import { UniqueConstraintError } from "sequelize";
import { validateStudentRegistration } from "../utils/student-registration.validation.js";
import jwt from "jsonwebtoken";
import { generateDefaultPassword } from "../utils/student.utils.js";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const normalizeSemesterRank = (semester: { SemesterNumber?: number; SemesterName?: string }) => {
  if (typeof semester.SemesterNumber === "number" && Number.isFinite(semester.SemesterNumber)) {
    return semester.SemesterNumber;
  }

  if (semester.SemesterName) {
    const match = semester.SemesterName.match(/(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  }

  return Number.MAX_SAFE_INTEGER;
};

export class StudentAuthController {
  /**
   * POST /api/auth/student/login
   * Login with email or register number
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.body;
      const password = (req.body.password || ''); // Remove trim() to preserve exact user input

      if (!identifier || !password) {
        res.status(400).json({ error: "Identifier and password are required" });
        return;
      }

      // Check if identifier is email or register number
      const cleanIdentifier = (identifier || '').trim();
      const isEmail = cleanIdentifier.includes("@");

      let user;
      let studentDoc: any = null;
      const normalizedIdentifier = isEmail ? cleanIdentifier.toLowerCase() : cleanIdentifier.toUpperCase();


      if (isEmail) {
        user = await User.findOne({
          where: { Email: normalizedIdentifier, Role: "student", IsActive: true },
          include: [{ model: Student, as: 'Student' }]
        });
        studentDoc = (user as any)?.Student;
        console.log(`[LoginTrace] Email lookup result: ${user ? 'User Found' : 'User NOT Found'}`);
      } else {
        studentDoc = await Student.findOne({
          where: { RegisterNumber: normalizedIdentifier },
          include: [{ model: User, required: true, where: { Role: "student", IsActive: true } }]
        });
        if (studentDoc) {
          user = (studentDoc as any).User;
        }
        console.log(`[LoginTrace] RegisterNumber lookup result: ${studentDoc ? 'Student Found' : 'Student NOT Found'}`);
        if (studentDoc && !user) {
          console.warn(`[LoginTrace] Student record found for ${normalizedIdentifier} but User association is missing or inactive!`);
        }
      }

      if (!user) {
        console.warn(`[LoginTrace] Authentication failed: User not found or inactive for identifier: ${normalizedIdentifier}`);
        res.status(401).json({ error: "Invalid credentials or account inactive" });
        return;
      }

      // Check for account lockout
      if (user.AccountLockedUntil) {
        const lockTime = new Date(user.AccountLockedUntil);
        if (!isNaN(lockTime.getTime()) && lockTime > new Date()) {
          const remainingMinutes = Math.ceil((lockTime.getTime() - Date.now()) / 60000);
          res.status(403).json({
            error: "Account locked",
            message: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`
          });
          return;
        }
      }

      if (!user.PasswordHash) {
        res.status(401).json({ error: "Authentication failed. Please contact admin to reset your password." });
        return;
      }

      let isPasswordValid = await bcrypt.compare(password, user.PasswordHash);


      if (!isPasswordValid) {

        // Increment failed attempts
        const failedAttempts = (Number(user.FailedLoginAttempts) || 0) + 1;
        let lockUntil = user.AccountLockedUntil;

        if (failedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        }

        // Use a RAW query to bypass Sequelize's date-conversion logic which causes MSSQL errors
        const formattedLockUntil = lockUntil ? lockUntil.toISOString().replace('T', ' ').slice(0, 19) : null;

        await sequelize.query(
          "UPDATE Users SET FailedLoginAttempts = ?, AccountLockedUntil = ? WHERE UserID = ?",
          {
            replacements: [failedAttempts, formattedLockUntil, user.UserID],
            type: QueryTypes.UPDATE
          }
        );

        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      console.log(`[LoginTrace] Password verified successfully for user: ${user.Email}`);

      // Reset failed attempts on successful login
      if (user.FailedLoginAttempts > 0 || user.AccountLockedUntil) {
        await User.update({
          FailedLoginAttempts: 0,
          AccountLockedUntil: null
        }, { where: { UserID: user.UserID } });
      }

      // Check if password change is required
      if (user.IsPasswordChanged === false) {
        console.log("[LoginTrace] Password change required. Generating temp token for user:", user.UserID);
        // Generate a restricted temporary token with full payload required by middleware
        const tempToken = jwt.sign(
          {
            UserID: user.UserID,
            Email: user.Email,
            Role: user.Role,
            IsPasswordChanged: false,
            IsRootAdmin: false,
            isTemp: true
          },
          process.env.JWT_ACCESS_SECRET || 'secret',
          { expiresIn: '15m' }
        );

        res.status(200).json({
          requirePasswordChange: true,
          message: "Please change your password to continue",
          tempToken
        });
        return;
      }

      // 4. Generate standard login tokens
      const payload: JWTPayload = {
        UserID: user.UserID,
        Email: user.Email as string | null,
        Role: user.Role,
        IsPasswordChanged: !!user.IsPasswordChanged,
        IsRootAdmin: !!user.IsRootAdmin
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken({ UserID: user.UserID });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/refresh",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          UserID: user.UserID,
          Email: user.Email,
          FullName: user.FullName,
          Role: user.Role,
          RegisterNumber: studentDoc?.RegisterNumber
        }
      });

    } catch (error: any) {
      res.status(500).json({

        error: "Authentication failed",
        message: error.message || "An internal error occurred"
      });
    }
  }

  /**
   * POST /api/auth/student/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    let createdUserID: number | null = null;
    try {
      const { FullName, Email, RegisterNumber, DepartmentID, ProgramID, BatchYear, Password, ConfirmPassword } = req.body;

      // Run comprehensive validation on all fields
      const validation = validateStudentRegistration({
        FullName,
        Email,
        RegisterNumber,
        DepartmentID,
        ProgramID,
        BatchYear,
        Password,
        ConfirmPassword
      });

      // If validation failed, return all errors
      if (!validation.isValid) {
        res.status(400).json({
          error: "Validation failed",
          validationErrors: validation.errors
        });
        return;
      }

      const departmentId = DepartmentID ? Number(DepartmentID) : null;
      const programId = ProgramID ? Number(ProgramID) : null;
      const batchYear = Number(BatchYear);

      // Additional numeric validation for BatchYear (since Department/Program are now optional)
      if (!Number.isFinite(batchYear) || batchYear <= 0) {
        res.status(400).json({ error: "Invalid batch year provided" });
        return;
      }

      // Duplicate checks
      const existingEmail = Email ? await User.findOne({ where: { Email: Email.toLowerCase() } }) : null;
      if (existingEmail) {
        res.status(400).json({
          error: "Validation failed",
          validationErrors: { Email: "Email is already registered" }
        });
        return;
      }

      const existingRegNum = await Student.findOne({ where: { RegisterNumber: RegisterNumber.toUpperCase() } });
      if (existingRegNum) {
        res.status(400).json({
          error: "Validation failed",
          validationErrors: { RegisterNumber: "Register Number is already registered" }
        });
        return;
      }

      let semesterId: number | null = null;

      // Only validate program/semester if they are provided
      if (programId && departmentId) {
        // Validate program belongs to the selected department (supports legacy and bridge-table mappings).
        const program = await Program.findOne({ where: { ProgramID: programId } });
        let programDepartmentLink = null;

        try {
          programDepartmentLink = await ProgramDepartment.findOne({ where: { ProgramID: programId, DepartmentID: departmentId } });
        } catch (lookupError) {
          console.warn("ProgramDepartment lookup skipped:", lookupError);
        }

        const isLinkedViaLegacy = program?.DepartmentID === departmentId;
        if (!program || (!programDepartmentLink && !isLinkedViaLegacy)) {
          res.status(400).json({ error: "Selected program is not mapped to the chosen department" });
          return;
        }

        // Verify semesters exist for this program and pick the first real semester safely.
        const semesters = await Semester.findAll({
          where: {
            ProgramID: programId,
            IsActive: true,
          },
        });

        if (semesters.length > 0) {
          const initialSemester = [...semesters]
            .sort((a, b) => normalizeSemesterRank(a) - normalizeSemesterRank(b))[0];

          if (initialSemester?.SemesterID) {
            semesterId = initialSemester.SemesterID;
          }
        }
      }

      const hashPassword = await bcrypt.hash(Password, 12);

      // Step 1: Create User with normalized email and full name
      const user = await User.create({
        Email: Email.toLowerCase(),
        FullName: FullName.trim(),
        PasswordHash: hashPassword,
        Role: "student",
        IsActive: true,
        IsPasswordChanged: true, // User set their own password
      });
      createdUserID = user.UserID;

      // Step 2: Create Student (if this fails, compensate by deleting the User)
      await Student.create({
        UserID: user.UserID,
        RegisterNumber: RegisterNumber.toUpperCase(),
        FullName: FullName.trim(),
        DepartmentID: departmentId as any,
        ProgramID: programId as any,
        SemesterID: semesterId as any,
        BatchYear: batchYear,
        Status: "ACTIVE",
        AdmissionDate: null
      });

      res.status(201).json({ message: "Registration successful. You can now log in." });
    } catch (error: any) {
      // Compensate: delete user if student creation failed
      if (createdUserID) {
        await User.destroy({ where: { UserID: createdUserID } }).catch(() => { });
      }
      if (error instanceof UniqueConstraintError) {
        const fields = Object.keys(error.fields || {});
        const message = fields.includes("Email")
          ? "Email is already registered"
          : fields.includes("RegisterNumber")
            ? "Register Number is already registered"
            : "Duplicate value already exists";
        res.status(400).json({ error: message, message });
        return;
      }
      const detail = error?.errors?.map((e: any) => e.message).join(', ')
        || error?.original?.message
        || error?.message
        || JSON.stringify(error);
      console.error("Registration error:", detail);
      res.status(500).json({ error: "Registration failed", message: detail });
    }
  }


  /**
   * POST /api/auth/student/forgot-password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const user = await User.findOne({ where: { Email: email, Role: "student", IsActive: true } });
      if (!user) {
        // Silent failure for security
        res.json({ message: "If an account exists, a reset link has been sent." });
        return;
      }

      const resetToken = generateRandomToken(32);
      const tokenHash = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await PasswordReset.create({
        UserID: user.UserID,
        TokenHash: tokenHash,
        ExpiresAt: expiresAt,
        UsedAt: null,
      });

      // Send Reset Email Flow (MOCK for now, should integrate real email service if needed)
      // const resetLink = `http://localhost:5173/student/reset-password?token=${resetToken}`;
      // await emailService.sendPasswordResetEmail(email, resetLink);

      console.log(`[StudentAuth] Reset token generated: ${resetToken}`); // For testing!
      res.json({ message: "If an account exists, a reset link has been sent.", debugToken: resetToken });
    } catch (error: any) {
      console.error("Forgot password error:", error.message);
      res.status(500).json({ error: "Failed to process request" });
    }
  }

  /**
   * POST /api/auth/student/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: "Token and new password are required" });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }

      const tokenHash = hashToken(token);
      const resetRecord = await PasswordReset.findOne({
        where: {
          TokenHash: tokenHash,
          UsedAt: null,
          ExpiresAt: { [Op.gt]: new Date() }
        }
      });

      if (!resetRecord) {
        res.status(400).json({ error: "Invalid or expired password reset token" });
        return;
      }

      const user = await User.findByPk(resetRecord.UserID);
      if (!user) {
        res.status(400).json({ error: "User associated with token not found" });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await user.update({ PasswordHash: passwordHash, IsPasswordChanged: true });
      await resetRecord.update({ UsedAt: new Date() });

      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error("Reset password error:", error.message);
      res.status(500).json({ error: "Password reset failed" });
    }
  }

  /**
   * POST /api/auth/student/change-password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const currentPassword = (req.body.currentPassword || '');
      const newPassword = (req.body.newPassword || '');
      const UserID = req.user?.UserID;

      console.log(`[ChangePassword] Attempt for UserID: ${UserID}`);

      if (!UserID) {
        console.warn("[ChangePassword] No UserID found in request user object");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!currentPassword || !newPassword) {
        console.warn("[ChangePassword] Missing passwords in request body");
        res.status(400).json({ error: "Current and new passwords are required" });
        return;
      }

      if (newPassword.length < 8) {
        console.warn("[ChangePassword] New password too short:", newPassword.length);
        res.status(400).json({ error: "New password must be at least 8 characters" });
        return;
      }

      const user = await User.findByPk(UserID);
      if (!user) {
        console.error(`[ChangePassword] User not found for ID: ${UserID}`);
        res.status(404).json({ error: "User not found" });
        return;
      }

      console.log(`[ChangePassword] Session User:`, JSON.stringify(req.user));
      console.log(`[ChangePassword] DB User: ID=${user.UserID}, Email=${user.Email}, Role=${user.Role}`);

      const currentPassHex = Buffer.from(currentPassword).toString('hex');
      console.log(`[ChangePassword] Received Current Password Hex: ${currentPassHex}`);

      let isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);

      // DYNAMIC SAFETY FALLBACK: If hash compare fails but input matches system default utility
      if (!isMatch && !user.IsPasswordChanged) {
        // Find the student record to get the register number for the utility
        const student = await Student.findOne({ where: { UserID: user.UserID } });
        const systemDefault = generateDefaultPassword(user.FullName || '', student?.RegisterNumber || '');
        if (currentPassword === systemDefault) {
          isMatch = true;
        }
      }

      if (!isMatch) {
        res.status(400).json({ error: "Incorrect current password" });
        return;
      }

      console.log("[ChangePassword] Password verified. Proceeding to update.");

      // Hash and update
      const hashed = await bcrypt.hash(newPassword, 10);


      await User.update({
        PasswordHash: hashed,
        IsPasswordChanged: true
      }, { where: { UserID: user.UserID } });

      // Verify the update worked immediately
      const updatedUser = await User.findByPk(user.UserID);
      const verifyMatch = await bcrypt.compare(newPassword, updatedUser?.PasswordHash || '');

      if (!verifyMatch) {
        throw new Error("Critical: Password update verification failed after database write.");
      }

      // Generate a fresh full access token
      const payload: JWTPayload = {
        UserID: user.UserID,
        Email: user.Email as string | null,
        Role: user.Role,
        IsPasswordChanged: true,
        IsRootAdmin: user.IsRootAdmin
      };

      const accessToken = signAccessToken(payload);

      res.json({
        message: "Password updated successfully",
        accessToken
      });
    } catch (error: any) {
      console.error("Change password error:", error.message);
      res.status(500).json({ error: "Failed to update password" });
    }
  }
}
