import { sequelize } from '../src/config/database.js';
import { QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { User } from '../src/models/User.js';
import { Student } from '../src/models/Student.js';

await sequelize.authenticate();

// Check PasswordHash column
const col = await sequelize.query<any>(`
    SELECT name, is_nullable, max_length FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'PasswordHash'
`, { type: QueryTypes.SELECT });
console.log('PasswordHash column info:', col);

// Try creating a test user + student
const t = await sequelize.transaction();
try {
    const hash = await bcrypt.hash('placeholder', 4);
    const user = await User.create({
        Email: `test_seating_123@seating.internal`,
        FullName: 'Test Student',
        PasswordHash: hash,
        Role: 'student',
        IsRootAdmin: false,
    } as any, { transaction: t });
    console.log('User created, ID:', user.UserID);

    const student = await Student.create({
        UserID: user.UserID,
        RegisterNumber: 'TEST_REG_123',
    } as any, { transaction: t });
    console.log('Student created, ID:', (student as any).StudentID);

    // Rollback so we don't pollute the DB
    await t.rollback();
    console.log('Test passed - Student can be created without Dept/Program/Semester');
} catch (e: any) {
    await t.rollback();
    console.error('Test FAILED:', e.message);
}

await sequelize.close();
process.exit(0);
