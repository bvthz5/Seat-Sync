
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
    const filePath = path.join(__dirname, 'S3Time.xlsx');
    // console.log(`Reading file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet['!ref']) {
        console.log(JSON.stringify({ error: "Empty sheet" }));
    } else {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const headers = [];
        const C = range.s.c;
        const R = range.s.r;

        for (let c = C; c <= range.e.c; ++c) {
            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: c })];
            headers.push(cell ? cell.v : `UNKNOWN_C${c}`);
        }

        const data = XLSX.utils.sheet_to_json(sheet, { header: headers, range: 1 });

        const result = {
            sheetName,
            headers,
            sampleData: data.slice(0, 3)
        };

        console.log(JSON.stringify(result, null, 2));
    }

} catch (error) {
    console.error(JSON.stringify({ error: error.message }));
}
