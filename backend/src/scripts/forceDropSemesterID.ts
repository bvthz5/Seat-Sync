import { sequelize } from '../config/database.js';

async function forceDrop() {
  try {
    console.log('Force dropping SemesterID constraint and column...');
    
    // Force drop constraint by name
    await sequelize.query(`
      IF OBJECT_ID('FK__Subjects__Semest__74AE54BC', 'F') IS NOT NULL
      BEGIN
        ALTER TABLE Subjects DROP CONSTRAINT FK__Subjects__Semest__74AE54BC;
        PRINT 'Dropped foreign key constraint';
      END
    `);
    
    // Force drop column
    await sequelize.query(`
      IF COL_LENGTH('Subjects', 'SemesterID') IS NOT NULL
      BEGIN
        ALTER TABLE Subjects DROP COLUMN SemesterID;
        PRINT 'Dropped SemesterID column';
      END
    `);
    
    console.log('✓ Force drop completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceDrop();
