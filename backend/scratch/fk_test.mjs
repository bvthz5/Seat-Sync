import { sequelize } from '../dist/config/database.js';

async function check() {
    const res = await sequelize.query(`
        SELECT object_name(parent_object_id) as referencing_table, 
               object_name(referenced_object_id) as referenced_table 
        FROM sys.foreign_keys 
        WHERE object_name(referenced_object_id) IN ('Blocks', 'Floors', 'Rooms', 'Seats', 'Zones')
    `);
    console.log(res[0]);
    process.exit(0);
}
check();