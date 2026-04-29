import React, { useState, useEffect } from 'react';
import { Button, Tab, Tabs } from '@heroui/react';
import { Search, Bell, Plus, Filter, CheckCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { NotificationStatsDisplay } from '../components/notifications/NotificationStats';
import { NotificationFeed } from '../components/notifications/NotificationFeed';
import { NotificationFilters } from '../components/notifications/NotificationFilters';
import { CreateNotification } from '../components/notifications/CreateNotification';
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationStats,
    initNotificationSocket
} from '../services/notificationService';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';

const Notifications: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [notifications, setNotifications] = useState<any[]>([]);
    const [stats, setStats] = useState({ unread: 0, critical: 0 });
    const [filters, setFilters] = useState({ category: [], type: [] });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Initialize Socket and Fetch Data
    useEffect(() => {
        if (user) {
            fetchNotifications();
            fetchStats();

            // Socket Listener
            initNotificationSocket(user.UserID, (newNotification) => {
                setNotifications(prev => [newNotification, ...prev]);
                fetchStats(); // Update stats
            });
        }
    }, [user, activeTab]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Determine if we need to filter for 'unread' tab
            const isUnreadTab = activeTab === "unread";
            const data = await getMyNotifications({
                limit: 50,
                unreadOnly: isUnreadTab
            });
            setNotifications(data.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await getNotificationStats();
            setStats(data);
        } catch (error) {
            console.error("Failed stats", error);
        }
    };

    const handleMarkRead = async (id: number) => {
        try {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            fetchStats();
            toast.success("Marked as read");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success("Deleted notification");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            fetchStats();
            toast.success("All notifications marked as read");
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    // Filter Logic
    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filters.category.length === 0 || filters.category.includes(n.category as never);
        const matchesType = filters.type.length === 0 || filters.type.includes(n.type as never);

        return matchesSearch && matchesCategory && matchesType;
    });

    return (
        <div className="min-h-screen bg-[#F0F4F8] p-6 lg:p-10 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-10">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                                <Sparkles className="text-white w-6 h-6" fill="currentColor" />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Command Center
                            </h1>
                        </div>
                        <p className="text-base text-slate-500 font-medium pl-1">
                            Manage critical alerts, system messages, and emergency broadcasts.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="flat"
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold px-6 h-12 shadow-sm"
                            startContent={<CheckCheck size={18} />}
                            onClick={handleMarkAllRead}
                        >
                            Mark All Read
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-12 shadow-xl shadow-indigo-200 transition-transform active:scale-95"
                            startContent={<Plus size={20} strokeWidth={3} />}
                            onClick={() => setActiveTab("create")}
                        >
                            New Notification
                        </Button>
                    </div>
                </header>

                {/* Stats */}
                <NotificationStatsDisplay stats={stats} />

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Left Panel: Feed or Create Form */}
                    <main className="flex-1 space-y-6">

                        {/* Control Bar */}
                        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 sticky top-6 z-30 backdrop-blur-md bg-white/90">

                            {/* Improved Tabs */}
                            <Tabs
                                aria-label="Sections"
                                variant="light"
                                color="primary"
                                classNames={{
                                    tabList: "gap-2 w-full relative rounded-xl p-1 border-b border-divider",
                                    cursor: "w-full bg-indigo-600 rounded-lg shadow-md",
                                    tab: "max-w-fit px-4 h-10",
                                    tabContent: "font-bold group-data-[selected=true]:text-white text-slate-500"
                                }}
                                selectedKey={activeTab}
                                onSelectionChange={(key) => setActiveTab(key as string)}
                            >
                                <Tab key="overview" title="Overview" />
                                <Tab key="unread" title="Unread Only" />
                                <Tab key="create" title="Compose" />
                            </Tabs>

                            <div className="w-px h-8 bg-slate-200 hidden md:block" />

                            {/* Search Input */}
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input id="input-f34v8hv" name="input-f34v8hv" type="text"
                                    placeholder="Search notifications by title or content..."
                                    className="w-full pl-10 pr-4 h-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Mobile Filter Toggle (Visible on small screens only if needed, currently hidden) */}
                            <div className="md:hidden">
                                <Button isIconOnly variant="flat">
                                    <SlidersHorizontal size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === "create" ? (
                                <CreateNotification />
                            ) : (
                                <NotificationFeed
                                    notifications={filteredNotifications}
                                    onMarkRead={handleMarkRead}
                                    onDelete={handleDelete}
                                />
                            )}
                        </div>
                    </main>

                    {/* Right Panel: Filters (Hidden on Create) */}
                    {activeTab !== "create" && (
                        <aside className="w-full lg:w-80 space-y-6">
                            <NotificationFilters filters={filters} setFilters={setFilters} />

                            {/* Tip Card */}
                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform rotate-12">
                                    <Bell size={120} />
                                </div>
                                <h3 className="font-bold text-lg mb-2 relative z-10">Pro Tip</h3>
                                <p className="text-indigo-100 text-sm leading-relaxed relative z-10 opacity-90">
                                    Use "Emergency" type for critical alerts. This will bypass user DND settings and trigger a distinct sound.
                                </p>
                            </div>
                        </aside>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Notifications;
