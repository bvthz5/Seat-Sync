
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

// --- Types ---

export type NotificationType = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'EMERGENCY';
export type NotificationCategory = 'SYSTEM' | 'EXAM' | 'ADMIN' | 'STUDENT' | 'SECURITY';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface Notification {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    sentAt: string;
    isRead: boolean;
    readAt?: string;
    metadata?: any;
}

export interface NotificationStats {
    unread: number;
    critical: number;
}

// --- Socket Service ---
let socket: Socket | null = null;
const SOCKET_URL = 'http://localhost:5000'; // Adjust for production

export const initNotificationSocket = (userId: number, onNewNotification: (n: Notification) => void) => {
    if (socket) return socket;

    socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log('Notification Socket Connected');
        socket?.emit('join_room', `user_${userId}`);
    });

    socket.on('notification', (payload: any) => {
        // Map payload to Notification interface if needed
        const notification: Notification = {
            id: payload.id,
            title: payload.title,
            message: payload.message,
            type: payload.type,
            category: payload.category,
            priority: payload.priority,
            sentAt: payload.createdAt,
            isRead: false,
            metadata: payload.metadata
        };

        onNewNotification(notification);

        if (notification.priority === 'CRITICAL' || notification.type === 'EMERGENCY') {
            toast.error(`EMERGENCY: ${notification.title}`, { duration: 10000 });
        } else {
            toast(`New Notification: ${notification.title}`, { icon: '🔔' });
        }
    });

    return socket;
};

// --- API Service ---

const API_URL = 'http://localhost:5000/api/notifications';

// Helper to get token (adjust based on your auth implementation)
const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const createNotification = async (data: any): Promise<Notification> => {
    const response = await axios.post(API_URL, data, getHeaders());
    return response.data.data;
};

export const getMyNotifications = async (params: any = {}): Promise<{ data: Notification[], total: number }> => {
    const response = await axios.get(`${API_URL}/my`, { ...getHeaders(), params });
    return response.data;
};

export const getNotificationStats = async (): Promise<NotificationStats> => {
    const response = await axios.get(`${API_URL}/stats`, getHeaders());
    return response.data.data;
};

export const markAsRead = async (id: number): Promise<void> => {
    await axios.put(`${API_URL}/${id}/read`, {}, getHeaders());
};

export const markAllAsRead = async (): Promise<void> => {
    await axios.put(`${API_URL}/read-all`, {}, getHeaders());
};

export const deleteNotification = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/${id}`, getHeaders());
};

// Admin: Get all notifications history
export const getAllNotificationsAdmin = async (params: any = {}): Promise<{ data: Notification[], total: number }> => {
    const response = await axios.get(`${API_URL}/admin/all`, { ...getHeaders(), params });
    return response.data;
};

// --- Legacy Support Mocks (to prevent breaking other modules) ---
export const getRecipientCount = async (filters: any) => {
    // Mock logic: Simulate DB query delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Return mock counts based on filters for realism
    if (filters.type === 'all') return 2450;
    if (filters.type === 'student') return 2200;
    if (filters.type === 'invigilator') return 150;
    if (filters.type === 'admin') return 12;
    if (filters.type === 'exam') return Math.floor(Math.random() * (400 - 50) + 50); // Random class size
    if (filters.type === 'department') return Math.floor(Math.random() * (600 - 100) + 100);

    return 0;
};

export const sendBroadcast = async (data: any) => {
    return createNotification(data);
};

export const getNotifications = async () => {
    const res = await getAllNotificationsAdmin();
    return res.data;
};
