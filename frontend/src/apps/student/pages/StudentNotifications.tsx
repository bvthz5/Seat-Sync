import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, 
    Clock, 
    Loader2, 
    Search,
    Inbox,
    AlertTriangle,
} from 'lucide-react';
import { studentPortalApi } from '../services/studentPortal';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'GENERAL'>('ALL');
    const { theme } = useStudentTheme();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await studentPortalApi.getNotifications();
                const noteList = Array.isArray(res) ? res : res?.data || res?.notifications || [];
                setNotifications(noteList);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    const filteredNotifications = notifications.filter(note => {
        const matchesSearch = 
            note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            note.message?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filter === 'ALL') return matchesSearch;
        return matchesSearch && note.priority === filter;
    });

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4" size={28} />
                <p className="text-indigo-600 dark:text-indigo-300/60 font-black uppercase tracking-[0.25em] text-[10px]">Updating Feed...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 flex flex-col justify-start h-full w-full max-w-4xl mx-auto">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Bulletins & Notifications</h1>
                    <p className={`text-sm mt-1.5 font-semibold transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Important updates, seating disclosures, and campus warnings.</p>
                </div>
                
                {/* Search */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter bulletins..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full sm:w-60 pl-11 pr-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-semibold shadow-sm text-sm ${
                                isDark 
                                    ? 'bg-[#0C1220] border-slate-800 text-slate-200' 
                                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                            }`}
                        />
                    </div>
                </div>
            </header>

            {/* Filter Tabs */}
            <div className={`flex items-center gap-2 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                {[
                    { key: 'ALL', label: 'All Updates' },
                    { key: 'CRITICAL', label: 'Critical Alerts' },
                    { key: 'GENERAL', label: 'General Info' },
                ].map((tab) => {
                    const isActive = filter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                                isActive 
                                    ? 'bg-indigo-600 border-indigo-500/30 text-white shadow-md' 
                                    : isDark 
                                        ? 'bg-transparent border-slate-800 hover:border-slate-800 text-slate-400 hover:text-slate-200' 
                                        : 'bg-transparent border-slate-200 hover:border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Notifications Feed */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((note, i) => {
                            const isCritical = note.priority === 'CRITICAL';
                            return (
                                <motion.div
                                    key={note.id || i}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: i * 0.04 }}
                                    className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden group transition-colors duration-500 ${
                                        isDark 
                                            ? isCritical ? 'bg-[#0C1220]/75 border-rose-500/20' : 'bg-[#0C1220]/75 border-slate-800/85'
                                            : isCritical ? 'bg-white border-rose-200 shadow-[0_8px_30px_rgba(244,63,94,0.02)]' : 'bg-white border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'
                                    }`}
                                >
                                    {isCritical && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                                    )}
                                    
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                                            isCritical 
                                                ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20' 
                                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                        }`}>
                                            {isCritical ? <AlertTriangle size={20} /> : <Bell size={20} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <h3 className={`font-extrabold text-sm sm:text-base uppercase tracking-tight truncate transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                                    {note.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 shrink-0">
                                                    <Clock size={11} />
                                                    <span>
                                                        {new Date(note.sentAt || note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {new Date(note.sentAt || note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <p className={`text-xs sm:text-sm mt-2 leading-relaxed font-semibold transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {note.message}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`py-24 text-center rounded-3xl border border-dashed transition-colors duration-500 ${
                                isDark ? 'bg-[#0C1220]/30 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
                            }`}
                        >
                            <div className={`w-14 h-14 border rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                                <Inbox size={24} className="text-slate-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-500 uppercase tracking-tight">No Bulletins</h3>
                            <p className="text-slate-500 text-xs font-semibold mt-1">There are no notices matching the selected filter.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentNotifications;
