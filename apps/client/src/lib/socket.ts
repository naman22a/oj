import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../global';

let socket: Socket | null = null;
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export function getSocket(): Socket | null {
    return socket;
}

export function connectSocket(): Socket | null {
    const token = getAccessToken();
    if (!token) return null;

    // create once
    if (!socket) {
        socket = io(API_ENDPOINT, {
            autoConnect: false,
            transports: ['polling', 'websocket']
        });
    }

    socket.auth = {
        accessToken: getAccessToken()
    };

    if (!socket.connected) {
        socket.connect();
    }

    return socket;
}
