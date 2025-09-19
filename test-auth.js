const axios = require('axios');

const baseURL = 'http://localhost:3000/api';

// Test user registration
async function testRegister() {
    try {
        console.log('Testing user registration...');
        const response = await axios.post(`${baseURL}/register`, {
            username: 'testuser',
            password: 'testpass123'
        });
        console.log('Registration successful:', response.data);
        return true;
    } catch (error) {
        console.error('Registration failed:', error.response?.data || error.message);
        return false;
    }
}

// Test user login
async function testLogin() {
    try {
        console.log('Testing user login...');
        const response = await axios.post(`${baseURL}/login`, {
            username: 'testuser',
            password: 'testpass123'
        });
        console.log('Login successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        return null;
    }
}

// Test session check
async function testSession() {
    try {
        console.log('Testing session check...');
        const response = await axios.get(`${baseURL}/session`);
        console.log('Session data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Session check failed:', error.response?.data || error.message);
        return null;
    }
}

// Test logout
async function testLogout() {
    try {
        console.log('Testing logout...');
        const response = await axios.post(`${baseURL}/logout`);
        console.log('Logout successful:', response.data);
        return true;
    } catch (error) {
        console.error('Logout failed:', error.response?.data || error.message);
        return false;
    }
}

// Run all tests
async function runTests() {
    console.log('Starting authentication tests...\n');

    // Test registration
    const registerSuccess = await testRegister();
    if (!registerSuccess) {
        console.log('Registration test failed, stopping tests.');
        return;
    }

    console.log('');

    // Test login
    const loginData = await testLogin();
    if (!loginData) {
        console.log('Login test failed, stopping tests.');
        return;
    }

    console.log('');

    // Test session
    await testSession();

    console.log('');

    // Test logout
    await testLogout();

    console.log('');

    // Test session after logout
    await testSession();

    console.log('\nAll tests completed!');
}

runTests().catch(console.error);
