
import api from '../../../services/api';
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
    type: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    sentAt: string;
    isRead: boolean;
    readAt?: string;
    metadata?: any;
    audience?: string[]; // Added
    status?: string; // Added to match UI usage
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

    socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('Notification Socket Connected');
        socket?.emit('join_room', `user_${userId}`);
    });

    socket.on('notification', (payload: any) => {
        // Queue heavy work to avoid blocking socket handler
        const processNotification = () => {
            const notification: Notification = {
                id: payload.id,
                title: payload.title,
                message: payload.message,
                type: payload.type?.toLowerCase?.() || 'info',
                category: payload.category || 'SYSTEM',
                priority: payload.priority || 'NORMAL',
                sentAt: payload.createdAt || new Date().toISOString(),
                isRead: false,
                metadata: payload.metadata,
                audience: ['Me'],
                status: 'Delivered'
            };

            onNewNotification(notification);
        };

        // Use Promise for non-blocking deferred execution
        Promise.resolve().then(processNotification).catch(err => 
            console.error('Failed to process notification:', err)
        );

        // Toast asynchronously
        Promise.resolve().then(() => {
            if (payload.priority === 'CRITICAL' || payload.type === 'EMERGENCY') {
                toast.error(`EMERGENCY: ${payload.title}`, { duration: 10000 });
            } else {
                toast(`New Notification: ${payload.title}`, { icon: '' });
            }
        });
    });

    return socket;
};

// --- API Service ---

const API_URL = '/notifications';

// Helper to get token (adjust based on your auth implementation)
// Removed manual header generation. API interceptor handles tokens.
const getHeaders = () => ({});

export const createNotification = async (data: any): Promise<Notification> => {
    const response = await api.post(API_URL, data);
    return response.data.data;
};

export const getMyNotifications = async (params: any = {}): Promise<{ data: Notification[], total: number }> => {
    const response = await api.get(`${API_URL}/my`, { params });
    // Assuming my notifications are standardized
    return response.data;
};

export const getNotificationStats = async (): Promise<NotificationStats> => {
    const response = await api.get(`${API_URL}/stats`);
    return response.data.data;
};

export const markAsRead = async (id: number): Promise<void> => {
    await api.put(`${API_URL}/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
    await api.put(`${API_URL}/read-all`);
};

export const deleteNotification = async (id: number): Promise<void> => {
    await api.delete(`${API_URL}/${id}`);
};

// Admin: Get all notifications history
export const getAllNotificationsAdmin = async (params: any = {}): Promise<{ data: Notification[], total: number }> => {
    const response = await api.get(`${API_URL}/admin/all`, { params });
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
    // Map PascalCase to camelCase and add audience
    return res.data.map((n: any) => ({
        id: n.NotificationID || n.id,
        title: n.Title || n.title,
        message: n.Message || n.message,
        type: (n.Type || n.type)?.toLowerCase(),
        category: n.Category || n.category,
        priority: n.Priority || n.priority,
        sentAt: n.SentAt || n.sentAt || n.createdAt,
        isRead: n.IsRead || n.isRead,
        audience: n.TargetType === 'ALL' ? ['All Users'] : n.TargetType === 'ROLE' ? [n.TargetId] : [n.TargetId ? n.TargetId : 'Unknown'],
        status: 'delivered'
    }));
};
