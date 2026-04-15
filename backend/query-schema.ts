import { sequelize } from './src/config/database.js';
sequelize.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rooms'").then(res => {
  console.log(res[0]);
  process.exit(0);
});