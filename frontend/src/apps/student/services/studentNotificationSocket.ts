import { io, Socket } from 'socket.io-client';

export interface StudentSocketNotification {
    id: number;
    title: string;
    message: string;
    type: string;
    category: string;
    priority: string;
    sentAt: string;
    isRead: boolean;
    metadata?: any;
}

let socket: Socket | null = null;
const listeners = new Set<(notification: StudentSocketNotification) => void>();

// Helper to ensure socket is connected proactively
const ensureConnected = () => {
    if (socket && socket.disconnected && socket.active !== false) {
        console.log('Proactively reconnecting student socket due to network or visibility event...');
        socket.connect();
    }
};

// Bind browser and system visibility/online state events for high connection resilience
if (typeof window !== 'undefined') {
    window.addEventListener('online', ensureConnected);
    window.addEventListener('focus', ensureConnected);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            ensureConnected();
        }
    });
    // Set a periodic health check to auto-recover from system sleep
    setInterval(ensureConnected, 15000);
}

export const unsubscribeFromStudentNotifications = (
    callback: (notification: StudentSocketNotification) => void,
) => {
    listeners.delete(callback);
};

export const initStudentNotificationSocket = (
    userId: number,
    onNotification?: (notification: StudentSocketNotification) => void,
) => {
    if (onNotification) {
        listeners.add(onNotification);
    }

    if (socket) {
        ensureConnected();
        return socket;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    socket = io(socketUrl, {
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        transports: ["websocket", "polling"]
    });

    socket.on('connect', () => {
        socket?.emit('join_room', `user_${userId}`);
    });

    socket.on('notification', (payload: any) => {
        const notification: StudentSocketNotification = {
            id: payload.id,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            category: payload.category,
            priority: payload.priority,
            sentAt: payload.createdAt,
            isRead: false,
            metadata: payload.metadata,
        };

        // Notify all registered listeners
        listeners.forEach((callback) => {
            try {
                callback(notification);
            } catch (err) {
                console.error('Error in student notification listener:', err);
            }
        });
    });

    return socket;
};

export const destroyStudentNotificationSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        listeners.clear();
        console.log('Student Notification Socket Destroyed');
    }
};