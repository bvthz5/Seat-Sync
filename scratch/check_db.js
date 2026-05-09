
import { sequelize } from "../backend/src/config/database.js";
import { InvigilatorAssignment, DutySwap, Faculty } from "../backend/src/models/index.js";

async function check() {
    try {
        const assignments = await InvigilatorAssignment.findAll({ limit: 10 });
        console.log("--- Last 10 Assignments ---");
        console.log(JSON.stringify(assignments, null, 2));

        const swaps = await DutySwap.findAll({ limit: 5, order: [['CreatedAt', 'DESC']] });
        console.log("--- Last 5 Swaps ---");
        console.log(JSON.stringify(swaps, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
