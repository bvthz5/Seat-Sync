import { sequelize } from '../src/config/database.js';
import { Program } from '../src/models/Program.js';
import ProgramDepartment from '../src/models/ProgramDepartment.js';

async function fix() {
    console.log("Connecting...");
    await sequelize.authenticate();
    
    console.log("Fetching programs...");
    const programs = await Program.findAll();
    
    let count = 0;
    for (const prog of programs) {
        if (prog.DepartmentID) {
             const [entry, created] = await ProgramDepartment.findOrCreate({
                where: {
                    ProgramID: prog.ProgramID,
                    DepartmentID: prog.DepartmentID
                },
                defaults: {
                    ProgramID: prog.ProgramID,
                    DepartmentID: prog.DepartmentID
                }
            });
            if (created) count++;
        }
    }
    
    console.log(`Successfully synced ${count} new Program-Department relationships!`);
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});