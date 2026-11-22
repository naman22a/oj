import { io } from 'socket.io-client';

const URL = 'http://localhost:5000';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error('Missing ACCESS_TOKEN environment variable');
    process.exit(1);
}

const socket = io(URL, {
    auth: {
        accessToken: ACCESS_TOKEN
    },
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

console.log(`Connecting to ${URL}...`);

socket.on('connect', () => {
    console.log('Connected successfully!');
    console.log('Socket ID:', socket.id);
    console.log('Listening for submission:updated events...\n');
});

socket.on('connect_error', (error) => {
    console.error('Connection failed:', error.message);
});

socket.on('submission:updated', (data) => {
    console.log('\n========== SUBMISSION UPDATE ==========');
    console.log(JSON.stringify(data, null, 2));
    console.log('=======================================\n');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});

socket.onAny((event, ...args) => {
    if (event !== 'submission:updated') {
        console.log(`[Event: ${event}]`, ...args);
    }
});

process.on('SIGINT', () => {
    console.log('\nClosing connection...');
    socket.disconnect();
    process.exit(0);
});
