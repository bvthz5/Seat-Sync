import React, { useState, useEffect } from 'react';
import { Button, ScrollShadow } from "@heroui/react";
import { X, Bell, AlertTriangle, Calendar, MessageSquare, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyNotifications, Notification, initNotificationSocket, markAllAsRead, markAsRead } from '../../services/notificationService';
import { invigilatorService } from '../../services/invigilatorService';
import { useAuth } from '../../../../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export const GlobalNotificationDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadNotifications();
            // Connect to socket
            initNotificationSocket(user.UserID, (newNotif) => {
                setNotifications(prev => [newNotif, ...prev]);
            });
        }
    }, [user, isOpen]);

    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            const [notifRes, swapRes] = await Promise.all([
                getMyNotifications({ limit: 20 }),
                invigilatorService.getSwaps('PENDING')
            ]);

            // Map swaps to virtual notifications
            const swapNotifs: Notification[] = (swapRes || []).map((s: any) => ({
                id: `swap-${s.SwapID}`, // String ID to avoid clash
                title: 'Duty Relief Request',
                message: `${s.Requester?.Name} is requesting a swap for ${s.Exam?.ExamName} on ${new Date(s.Exam?.ExamDate || Date.now()).toLocaleDateString()}.`,
                type: 'info',
                category: 'EXAM',
                priority: 'HIGH',
                sentAt: s.CreatedAt || new Date().toISOString(),
                isRead: false,
                metadata: { type: 'SWAP_REQUEST', swapId: s.SwapID }
            })) as any;

            const all = [...swapNotifs, ...notifRes.data].sort((a, b) => 
                new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
            );

            setNotifications(all);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleMarkRead = async (id: number) => {
        try {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[70] border-l border-slate-100 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="w-5 h-5 text-slate-700" />
                                    {notifications.some(n => !n.isRead) && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                <h2 className="font-bold text-lg text-slate-800">Notifications</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button isIconOnly size="sm" variant="light" radius="full" onPress={onClose}>
                                    <X size={18} className="text-slate-500" />
                                </Button>
                            </div>
                        </div>

                        {/* List */}
                        <ScrollShadow className="flex-1 p-0 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 flex justify-center">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1">All caught up!</h3>
                                    <p className="text-slate-500 text-sm">You have no new notifications.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((notif) => (
                                        <div key={notif.id} className={`p-5 transition-colors cursor-pointer group relative ${!notif.isRead ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                                                    notif.metadata?.type === 'SWAP_REQUEST' ? 'bg-indigo-100 text-indigo-600' :
                                                    notif.type === 'EMERGENCY' ? 'bg-red-100 text-red-600 animate-pulse' :
                                                    notif.priority === 'CRITICAL' ? 'bg-red-50 text-red-500' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {notif.metadata?.type === 'SWAP_REQUEST' ? <RefreshCcw size={18} /> :
                                                     notif.type === 'EMERGENCY' ? <AlertTriangle size={18} /> :
                                                     notif.category === 'EXAM' ? <Calendar size={18} /> :
                                                     <MessageSquare size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className={`font-bold text-sm truncate pr-2 ${notif.priority === 'CRITICAL' ? 'text-red-700' : 'text-slate-800'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                            {(() => {
                                                                try {
                                                                    const date = new Date(notif.sentAt);
                                                                    return new Intl.DateTimeFormat('en-US', {
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        hour12: true
                                                                    }).format(date);
                                                                } catch (e) {
                                                                    return '--:--';
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{notif.message}</p>
                                                    {!notif.isRead && !String(notif.id).startsWith('swap-') && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkRead(Number(notif.id));
                                                            }}
                                                            className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                                                        >
                                                            Mark as read
                                                        </button>
                                                    )}
                                                </div>
                                                {!notif.isRead && (
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollShadow>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <Button size="sm" variant="light" className="text-slate-500 font-medium" onPress={handleMarkAllRead}>
                                Mark all as read
                            </Button>
                            <Button size="sm" color="primary" variant="flat" className="font-bold">
                                View History
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
