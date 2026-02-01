import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';
const ROOT_ADMIN = {
    Email: 'root.seatsync@gmail.com',
    Password: 'Admin@123'
};

const api = axios.create({ baseURL: API_URL, validateStatus: () => true });

async function run() {
    try {
        console.log('1. Login');
        const loginRes = await api.post('/auth/login', { email: ROOT_ADMIN.Email, password: ROOT_ADMIN.Password });
        if (loginRes.status !== 200) { throw new Error(`Login failed: ${loginRes.status}`); }
        const token = loginRes.data.accessToken;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ Login OK');

        console.log('2. Create Invigilator');
        const newInvigilator = {
            FullName: `Test User ${Date.now()}`,
            Email: `test.${Date.now()}@example.com`,
            Password: 'Password123!',
            Designation: 'Test',
            DepartmentID: 1
        };
        const createRes = await api.post('/invigilators', newInvigilator);
        if (createRes.status !== 201) { throw new Error(`Create failed: ${createRes.status} - ${JSON.stringify(createRes.data)}`); }
        console.log('✅ Create OK');

        // Find ID (backend returns { message, invigilator: { FacultyID, ... } } or just invigilator?)
        // Let's check response structure in log if needed, but assuming structure from controller.
        // Controller: `res.status(201).json({ message: "Invigilator created successfully", invigilator: formattedInvigilator });`
        const createdId = createRes.data.invigilator?.InvigilatorID || createRes.data.invigilator?.FacultyID;
        if (!createdId) throw new Error(`Could not find ID in creation response: ${JSON.stringify(createRes.data)}`);
        console.log(`ℹ️ Created ID: ${createdId}`);

        console.log('3. Toggle Eligibility');
        const toggleRes = await api.patch(`/invigilators/${createdId}/toggle-eligibility`);
        if (toggleRes.status !== 200) { throw new Error(`Toggle Eligibility failed: ${toggleRes.status}`); }
        console.log(`✅ Toggle Eligibility OK. New status: ${toggleRes.data.isEligible}`);

        console.log('4. Toggle Flag');
        const flagRes = await api.patch(`/invigilators/${createdId}/toggle-flag`);
        if (flagRes.status !== 200) { throw new Error(`Toggle Flag failed: ${flagRes.status}`); }
        console.log(`✅ Toggle Flag OK. New status: ${flagRes.data.isFlagged}`);

        console.log('5. Delete Invigilator');
        const deleteRes = await api.delete(`/invigilators/${createdId}`);
        if (deleteRes.status !== 200) { throw new Error(`Delete failed: ${deleteRes.status}`); }
        console.log('✅ Delete OK');

        console.log('\n🎉 ALL TESTS PASSED');

    } catch (error: any) {
        console.error('❌ TEST FAILED:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

run();
