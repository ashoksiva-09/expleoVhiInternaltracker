const axios = require('axios');

const baseURL = 'http://localhost:3000/api';

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, url, data = null) {
    const jar = new (require('tough-cookie').CookieJar)();
    const instance = axios.create({
        baseURL,
        withCredentials: true,
        jar: jar,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    // First login as admin
    try {
        console.log('Logging in as admin...');
        const loginResponse = await instance.post('/login', {
            username: 'Adminuser',
            password: 'Adminpassword123'
        });
        console.log('Login successful:', loginResponse.data);
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        return null;
    }

    // Now make the authenticated request
    try {
        console.log(`Making ${method} request to ${url}...`);
        const config = { method, url };
        if (data) config.data = data;

        const response = await instance.request(config);
        console.log('Request successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('Request failed:', error.response?.data || error.message);
        console.error('Status code:', error.response?.status);
        if (error.response?.data) {
            console.error('Error details:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// Test updating a user
async function testUpdateUser() {
    console.log('Testing user update...');

    // First get all users to see what IDs exist
    const users = await makeAuthenticatedRequest('GET', '/users');
    if (!users) {
        console.log('Failed to get users list');
        return;
    }

    console.log('Available users:', users.map(u => ({ id: u.id, username: u.username })));

    // Try to update the first user (should be Adminuser with ID 1)
    if (users.length > 0) {
        const userToUpdate = users[0];
        console.log(`Attempting to update user: ${userToUpdate.username} (ID: ${userToUpdate.id})`);

        const updateData = {
            username: userToUpdate.username + '_updated',
            role: 'admin',
            customMenus: ['testMenu']
        };

        const result = await makeAuthenticatedRequest('PUT', `/users/${userToUpdate.id}`, updateData);
        if (result) {
            console.log('User update successful');
        } else {
            console.log('User update failed');
        }
    }
}

// Test creating a new user
async function testCreateUser() {
    console.log('Testing user creation...');

    const newUserData = {
        username: 'testuser_' + Date.now(),
        password: 'testpass123',
        role: 'vhiuser',
        customMenus: ['timesheetMenu', 'calendarMenu']
    };

    const result = await makeAuthenticatedRequest('POST', '/users', newUserData);
    if (result) {
        console.log('User creation successful, new user ID:', result.id);
        return result.id;
    } else {
        console.log('User creation failed');
        return null;
    }
}

// Run tests
async function runTests() {
    console.log('Starting user management tests...\n');

    // Test creating a user first
    const newUserId = await testCreateUser();
    console.log('');

    // Test updating a user
    await testUpdateUser();
    console.log('');

    console.log('Tests completed!');
}

runTests().catch(console.error);
