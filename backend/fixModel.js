const fs = require('fs');
let file = fs.readFileSync('../backend/src/models/Room.ts', 'utf-8');
file = file.replace(/TotalCapacity: \{\r?\n\s+type: DataTypes.INTEGER/g, 'TotalCapacity: {\n      field: "Capacity",\n      type: DataTypes.INTEGER');
fs.writeFileSync('../backend/src/models/Room.ts', file);
