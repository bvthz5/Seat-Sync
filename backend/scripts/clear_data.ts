import { sequelize } from '../src/config/database.js';
import { Student, User, Program, Department, ProgramDepartment, Semester, AcademicYear } from '../src/models/index.js';

const clearData = async () => {
  try {
    console.log('Starting to clear data...');
    await sequelize.transaction(async (t) => {
      // Destroy all students
      await Student.destroy({ where: {}, transaction: t, force: true });
      // Destroy all programs and departments (bridge table handles via cascade, but explicitly drop just in case)
      await ProgramDepartment.destroy({ where: {}, transaction: t, force: true });
      await Semester.destroy({ where: {}, transaction: t, force: true });
      await Program.destroy({ where: {}, transaction: t, force: true });
      await Department.destroy({ where: {}, transaction: t, force: true });
      await AcademicYear.destroy({ where: {}, transaction: t, force: true });
      // Optionally destroy users who are students
      await User.destroy({ where: { Role: 'Student' }, transaction: t, force: true });
    });
    console.log('Successfully cleared all academic and student data!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to clear data:', error);
    process.exit(1);
  }
};

clearData();
