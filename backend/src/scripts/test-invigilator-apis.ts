import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';
const ROOT_ADMIN = {
    Email: 'root.seatsync@gmail.com',
    Password: 'Admin@123'
};

let token = '';
let createdInvigilatorId: number | null = null;
let validDepartmentId: number | null = null;

const api = axios.create({
    baseURL: API_URL,
    validateStatus: () => true // Handle errors manually
});

async function login() {
    console.log('🔑 logging in...');
    const res = await api.post('/auth/login', {
        email: ROOT_ADMIN.Email,
        password: ROOT_ADMIN.Password
    });

    if (res.status === 200 && res.data.accessToken) {
        token = res.data.accessToken;
        console.log('✅ Login successful');
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        console.error('❌ Login failed:', res.status, res.data);
        process.exit(1);
    }
}

async function getAllInvigilators() {
    console.log('\n📋 Fetching all invigilators...');
    const res = await api.get('/invigilators');

    if (res.status === 200) {
        console.log(`✅ Success. Found ${res.data.length} invigilators.`);
        if (res.data.length > 0 && res.data[0].Department) {
            validDepartmentId = res.data[0].Department.DepartmentID;
            console.log(`ℹ️ Found valid DepartmentID: ${validDepartmentId}`);
        }
    } else {
        console.error('❌ Failed:', res.status, res.data);
    }
    return res.data;
}

async function getStats() {
    console.log('\n📊 Fetching stats...');
    const res = await api.get('/invigilators/stats');

    if (res.status === 200) {
        console.log('✅ Stats:', res.data);
    } else {
        console.error('❌ Failed:', res.status, res.data);
    }
}

async function createInvigilator() {
    if (!validDepartmentId) {
        console.log('⚠️ Skipping creation: No valid DepartmentID found yet.');
        return;
    }

    console.log('\n➕ Creating test invigilator...');
    const timestamp = Date.now();
    const newInvigilator = {
        FullName: `Test API User ${timestamp}`,
        Email: `test.api.${timestamp}@example.com`,
        Password: 'Password123!',
        Designation: 'Assistant Professor',
        DepartmentID: validDepartmentId
    };

    const res = await api.post('/invigilators', newInvigilator);

    if (res.status === 201) {
        console.log('✅ Created successfully:', res.data);
        // The create endpoint returns the created user/faculty. need to find the ID.
        // Based on controller, it returns: { message: "Invigilator created successfully", invigilator: { ... } }
        if (res.data.invigilator && res.data.invigilator.FacultyID) {
            createdInvigilatorId = res.data.invigilator.FacultyID;
            console.log(`ℹ️ New ID: ${createdInvigilatorId}`);
        }
    } else {
        console.error('❌ Creation failed:', res.status, res.data);
    }
}

async function toggleEligibility() {
    if (!createdInvigilatorId) return;

    console.log(`\n🔄 Toggling eligibility for ID ${createdInvigilatorId}...`);
    const res = await api.patch(`/invigilators/${createdInvigilatorId}/toggle-eligibility`);

    if (res.status === 200) {
        console.log('✅ Toggle successful. New status:', res.data.isEligible);
    } else {
        console.error('❌ Toggle failed:', res.status, res.data);
    }
}

async function toggleFlag() {
    if (!createdInvigilatorId) return;

    console.log(`\n🚩 Toggling flag for ID ${createdInvigilatorId}...`);
    // Note: The toggle flag endpoint uses Invigilator model, but createInvigilator makes a Faculty entry.
    // Sync logic might be needed or they share IDs?
    // In `invigilator.controller.ts`, `toggleInvigilatorFlag` looks up `Invigilator` model.
    // `createInvigilator` creates User -> Faculty.
    // Does it create an `Invigilator` record? 
    // Checking controller: `await Invigilator.create({ InvigilatorID: faculty.FacultyID, ... })`? 
    // If not, this might fail if they are separate tables not synced.
    // But let's test.
    const res = await api.patch(`/invigilators/${createdInvigilatorId}/toggle-flag`);

    if (res.status === 200) {
        console.log('✅ Flag toggle successful. New status:', res.data.isFlagged);
    } else if (res.status === 404) {
        console.error('❌ Flag toggle failed: Invigilator not found (Expected if Invigilator record is not created automatically)');
    } else {
        console.error('❌ Flag toggle failed:', res.status, res.data);
    }
}

async function deleteInvigilator() {
    if (!createdInvigilatorId) return;

    console.log(`\n🗑️ Deleting invigilator ID ${createdInvigilatorId}...`);
    const res = await api.delete(`/invigilators/${createdInvigilatorId}`);

    if (res.status === 200) {
        console.log('✅ Deleted successfully');
    } else {
        console.error('❌ Deletion failed:', res.status, res.data);
    }
}

async function run() {
    try {
        await login();
        await getAllInvigilators(); // tries to find department ID
        await getStats();

        // Only run modification tests if we have a department ID (implies data exists)
        if (validDepartmentId) {
            await createInvigilator();
            await toggleEligibility();
            await toggleFlag();
            await deleteInvigilator();
        } else {
            console.log('\n⚠️ Could not get DepartmentID from existing invigilators. Trying to fetch departments directly if needed, or skipping write tests.');
        }

    } catch (error: any) {
        console.error('❌ Unexpected error:', error);
        if (error.code) console.error('Error code:', error.code);
        if (error.response) console.error('Response:', error.response.data);
    }
}

run();
