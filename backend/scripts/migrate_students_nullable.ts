import { sequelize } from '../src/config/database.js';
import { QueryTypes } from 'sequelize';

await sequelize.authenticate();

console.log('Running migration: Make Students columns nullable...');

try {
    await sequelize.query(`
        DECLARE @sql NVARCHAR(MAX) = '';
        SELECT @sql += 'ALTER TABLE [dbo].[Students] DROP CONSTRAINT ' + fk.name + '; '
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        WHERE fk.parent_object_id = OBJECT_ID(N'[dbo].[Students]')
          AND c.name IN ('DepartmentID','ProgramID','SemesterID');
        IF LEN(@sql) > 0 EXEC sp_executesql @sql;
        PRINT 'FK constraints dropped';
        ALTER TABLE [dbo].[Students] ALTER COLUMN [DepartmentID] INT NULL;
        ALTER TABLE [dbo].[Students] ALTER COLUMN [ProgramID] INT NULL;
        ALTER TABLE [dbo].[Students] ALTER COLUMN [SemesterID] INT NULL;
        ALTER TABLE [dbo].[Students] ALTER COLUMN [BatchYear] INT NULL;
        PRINT 'Columns altered';
    `, { type: QueryTypes.RAW });
    console.log('Migration SQL executed successfully');
} catch (e: any) {
    console.error('Migration error:', e.message);
}

// Verify result
const cols = await sequelize.query<{ name: string; is_nullable: number }>(`
    SELECT name, is_nullable FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Students]') 
    AND name IN ('DepartmentID','ProgramID','SemesterID','BatchYear')
`, { type: QueryTypes.SELECT });

console.log('Column nullability after migration:');
cols.forEach((c: any) => console.log(`  ${c.name}: is_nullable=${c.is_nullable} (1=nullable, 0=not null)`));

await sequelize.close();
process.exit(0);
