import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function dropSemesterIDFromSubjects() {
  try {
    console.log('Dropping SemesterID column from Subjects table...');
    
    // Drop foreign key constraint first if it exists
    await sequelize.query(`
      IF OBJECT_ID('FK__Subjects__Semest__74AE54BC', 'F') IS NOT NULL
      ALTER TABLE Subjects DROP CONSTRAINT FK__Subjects__Semest__74AE54BC
    `);
    
    // Drop the column
    await sequelize.query(`
      IF COL_LENGTH('Subjects', 'SemesterID') IS NOT NULL
      ALTER TABLE Subjects DROP COLUMN SemesterID
    `);
    
    console.log('✓ SemesterID column dropped successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error dropping SemesterID column:', error);
    process.exit(1);
  }
}

dropSemesterIDFromSubjects();
