import { sequelize } from './config/database.js';

async function resetDB() {
    try {
        await sequelize.authenticate();
        await sequelize.query('EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
        await sequelize.query('EXEC sp_MSforeachtable "DELETE FROM ?"');
        await sequelize.query('EXEC sp_MSforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"');
        console.log('Database successfully cleared.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to clear database:', err);
        process.exit(1);
    }
}
resetDB();
