import * as xlsx from 'xlsx';
import { StructureImportService } from './src/services/structureImport.service.js';

const data = [
  ['Room Number with block', 'Number of Desks available in each row in the respective room (if a row is not available, keep the zero as such)', '', '', '', '', '', 'Total Capacity'],
  ['', 'Row A', 'Row B', 'Row C', 'Row D', 'Row E', 'Row F', ''],
  ['//Disregard//', 0, 0, 0, 0, 0, 0, 0],
  ['MTB 105', 6, 6, 6, 6, 6, 0, 60]
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
const buf = xlsx.write(wb, { type: 'buffer', bookType: 'csv' });

const svc = new StructureImportService();
svc.importFromCSV(buf, { autoZone: false, zoneCount: 3 }).then(res => {
  console.log("Success:", res);
  process.exit(0);
}).catch(err => {
  console.error("DB Error:", err.message);
  process.exit(1);
});