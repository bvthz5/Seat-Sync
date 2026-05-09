
import { sequelize } from '../src/config/database.js';

async function fixSchema() {
    try {
        console.log('Checking Invigilators table schema...');
        
        // Add FacultyID to Invigilators if it doesn't exist
        try {
            await sequelize.query("ALTER TABLE Invigilators ADD FacultyID INT NULL;");
            console.log('Added FacultyID column to Invigilators table.');
        } catch (e: any) {
            if (e.message.includes('already exists') || e.message.includes('Duplicate column')) {
                console.log('FacultyID column already exists.');
            } else {
                console.error('Error adding FacultyID column:', e.message);
            }
        }

        // Add foreign key constraint
        try {
            await sequelize.query("ALTER TABLE Invigilators ADD CONSTRAINT FK_Invigilators_Faculties FOREIGN KEY (FacultyID) REFERENCES Faculties(FacultyID);");
            console.log('Added FK_Invigilators_Faculties constraint.');
        } catch (e: any) {
            if (e.message.includes('already exists') || e.message.includes('Duplicate constraint')) {
                console.log('Constraint already exists.');
            } else {
                console.error('Error adding constraint:', e.message);
            }
        }

        console.log('Schema fix completed.');
        process.exit(0);
    } catch (error) {
        console.error('Schema fix failed:', error);
        process.exit(1);
    }
}

fixSchema();
