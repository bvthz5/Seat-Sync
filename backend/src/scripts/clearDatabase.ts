import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function clearDatabase() {
  try {
    console.log('Starting database clear...');
    
    // Disable foreign key constraints
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT ALL"');
    
    // Get all tables and delete from them
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'`,
      { type: QueryTypes.SELECT }
    );

    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      console.log(`Deleting data from ${tableName}...`);
      await sequelize.query(`DELETE FROM [${tableName}]`);
    }

    // Re-enable foreign key constraints
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? CHECK CONSTRAINT ALL"');
    
    console.log('✓ All data deleted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
