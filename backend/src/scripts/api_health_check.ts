
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_access_key_12345';
const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

console.log(`Using Secret: ${SECRET.substring(0, 5)}...`);

const token = jwt.sign(
    { UserID: 1, Role: 'exam_admin', IsRootAdmin: true, Email: 'admin@seatsync.com' },
    SECRET,
    { expiresIn: '1h' }
);

const endpoints = [
    { method: 'GET', url: '/students' },
    { method: 'GET', url: '/departments' },
    { method: 'GET', url: '/programs' },
    { method: 'GET', url: '/exams' },
    { method: 'GET', url: '/invigilators' },
    { method: 'GET', url: '/admin/college-structure/blocks' }, // Valid endpoint
    { method: 'GET', url: '/rooms' },
    { method: 'GET', url: '/subjects' }
];

async function check() {
    console.log(`Checking APIs at ${BASE_URL}...`);
    let passCount = 0;

    for (const ep of endpoints) {
        try {
            const res = await axios({
                method: ep.method,
                url: `${BASE_URL}${ep.url}`,
                headers: { Authorization: `Bearer ${token}` }
            });

            let count: number | string = 'N/A';
            if (Array.isArray(res.data)) count = res.data.length;
            else if (res.data.data && Array.isArray(res.data.data)) count = res.data.data.length;
            else if (res.data.students) count = res.data.students.length;
            else if (res.data.users) count = res.data.users.length;
            else if (res.data.totalItems) count = res.data.totalItems; // For paginated responses

            console.log(`[PASS] ${ep.method} ${ep.url} - Status: ${res.status}, Count: ${count}`);
            passCount++;
        } catch (error: any) {
            console.error(`[FAIL] ${ep.method} ${ep.url} - ${error.message} - Status: ${error.response?.status}`);
            if (error.response?.data) {
                console.error('Error Data:', JSON.stringify(error.response.data).substring(0, 500));
            }
        }
    }

    console.log(`\nResult: ${passCount}/${endpoints.length} Passed`);
}

check();
