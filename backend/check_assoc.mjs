import { sequelize } from "./src/config/database.js";
import * as models from "./src/models/index.js";

async function checkAssociations() {
    try {
        console.log("Registered models:", Object.keys(sequelize.models));
        // Check if associations are working
        for (const modelName of Object.keys(sequelize.models)) {
            const model = sequelize.models[modelName];
            console.log(`Checking associations for ${modelName}...`);
            Object.keys(model.associations).forEach(assocName => {
                console.log(`  - ${assocName}`);
            });
        }
        console.log("Associations check complete.");
    } catch (error) {
        console.error("Association Error:", error);
    } finally {
        process.exit(0);
    }
}

checkAssociations();
