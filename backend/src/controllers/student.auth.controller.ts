import { Request, Response } from "express";
import { User } from "../models/User.js";
import { Student } from "../models/Student.js";
import { Semester } from "../models/Semester.js";
import { sequelize } from "../config/database.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { JWTPayload } from "../interfaces/auth.interfaces.js";
import { generateRandomToken, hashToken } from "../utils/hash.js";
import { PasswordReset } from "../models/PasswordReset.model.js";

export class StudentAuthController {
  /**
   * POST /api/auth/student/login
   * Login with email or register number
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        res.status(400).json({ error: "Identifier and password are required" });
        return;
      }

      // Check if identifier is email or register number
      const isEmail = identifier.includes("@");

      let user;
      if (isEmail) {
        user = await User.findOne({
          where: { Email: identifier, Role: "student", IsActive: true },
          include: [{ model: Student, as: 'Student' }]
        });
      } else {
        const student = await Student.findOne({
          where: { RegisterNumber: identifier },
          include: [{ model: User, required: true, where: { Role: "student", IsActive: true } }]
        });
        if (student) {
          user = (student as any).User;
          (user as any).Student = student;
        }
      }

      if (!user) {
        res.status(401).json({ error: "Invalid credentials or account inactive" });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const payload: JWTPayload = {
        UserID: user.UserID,
        Email: user.Email,
        Role: user.Role,
        IsRootAdmin: user.IsRootAdmin,
        IsPasswordChanged: user.IsPasswordChanged,
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

      res.status(200).json({ accessToken, refreshToken, user });
    } catch (error: any) {
      console.error("Student login error:", error.message);
      res.status(500).json({ error: "Authentication failed", message: error.message });
    }
  }

  /**
   * POST /api/auth/student/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    let createdUserID: number | null = null;
    try {
      const { FullName, Email, RegisterNumber, DepartmentID, ProgramID, BatchYear, Password, ConfirmPassword } = req.body;

      if (!FullName || !Email || !RegisterNumber || !DepartmentID || !ProgramID || !BatchYear || !Password || !ConfirmPassword) {
        res.status(400).json({ error: "All required fields must be provided" });
        return;
      }
      if (Password !== ConfirmPassword) {
        res.status(400).json({ error: "Passwords do not match" });
        return;
      }

      // Duplicate checks
      const existingEmail = await User.findOne({ where: { Email } });
      if (existingEmail) { res.status(400).json({ error: "Email is already registered" }); return; }

      const existingRegNum = await Student.findOne({ where: { RegisterNumber } });
      if (existingRegNum) { res.status(400).json({ error: "Register Number is already registered" }); return; }

      // Verify semesters exist for this program
      const initialSemester = await Semester.findOne({
        where: { ProgramID: Number(ProgramID) },
        order: [['SemesterNumber', 'ASC']]
      });
      if (!initialSemester) {
        res.status(400).json({ error: "No semesters found for the selected program. Please contact admin." });
        return;
      }

      const hashPassword = await bcrypt.hash(Password, 12);

      // Step 1: Create User
      const user = await User.create({
        Email, FullName,
        PasswordHash: hashPassword,
        Role: "student",
        IsActive: true,
      });
      createdUserID = user.UserID;

      // Step 2: Create Student (if this fails, compensate by deleting the User)
      await Student.create({
        UserID: user.UserID,
        RegisterNumber,
        DepartmentID: Number(DepartmentID),
        ProgramID: Number(ProgramID),
        SemesterID: initialSemester.SemesterID,
        BatchYear: Number(BatchYear),
        Status: "ACTIVE",
        AdmissionDate: null
      });

      res.status(201).json({ message: "Registration successful. You can now log in." });
    } catch (error: any) {
      // Compensate: delete user if student creation failed
      if (createdUserID) {
        await User.destroy({ where: { UserID: createdUserID } }).catch(() => {});
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
}
