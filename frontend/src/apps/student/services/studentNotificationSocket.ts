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

export const initStudentNotificationSocket = (
    userId: number,
    onNotification: (notification: StudentSocketNotification) => void,
) => {
    if (socket) return socket;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    socket = io(socketUrl, { withCredentials: true });

    socket.on('connect', () => {
        socket?.emit('join_room', `user_${userId}`);
    });

    socket.on('notification', (payload: any) => {
        onNotification({
            id: payload.id,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            category: payload.category,
            priority: payload.priority,
            sentAt: payload.createdAt,
            isRead: false,
            metadata: payload.metadata,
        });
    });

    return socket;
};

export const destroyStudentNotificationSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};