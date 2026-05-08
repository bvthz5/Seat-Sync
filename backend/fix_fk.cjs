const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'seat_sync', 
  process.env.DB_USER || 'sa', 
  process.env.DB_PASS || 'sjcet', 
  {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mssql',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    logging: false,
    dialectOptions: {
      options: { encrypt: false }
    }
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    // Drop the old constraint
    try {
        await sequelize.query('ALTER TABLE InternalExams DROP CONSTRAINT FK__InternalE__Inter__59DB2E46;');
        console.log('Dropped old FK constraint.');
    } catch(e) {
        console.log('Old FK constraint might not exist or already dropped.', e.message);
    }

    // Add new constraint pointing to ExamSeries
    try {
        await sequelize.query('ALTER TABLE InternalExams ADD CONSTRAINT FK_InternalExams_ExamSeries FOREIGN KEY (InternalExamSeriesID) REFERENCES ExamSeries(ExamSeriesID) ON DELETE CASCADE;');
        console.log('Added new FK constraint linking InternalExams to ExamSeries.');
    } catch(e) {
        console.log('Error adding new constraint:', e.message);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
