import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Building, Shield, Bell,
    Clock, Smartphone, Globe, Activity, CheckCircle2,
    Lock, KeyRound, AlertTriangle, Save, Loader2,
    LogOut, ChevronRight, Eye, EyeOff, Check, RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { invigilatorService } from '../../admin/services/invigilatorService';

const MOCK_USER = {
    name: "John Mathew",
    role: "Senior Invigilator",
    department: "Computer Science",
    email: "john.mathew@university.edu",
    phone: "+1 (555) 123-4567",
    emergency: "+1 (555) 987-6543",
    language: "English",
    status: "Active",
    totalDuties: 34,
    lastLogin: "2 hours ago"
};

const SESSIONS = [
    { id: 1, device: "MacBook Pro 16\"", browser: "Chrome", location: "Campus Network", ip: "192.168.1.105", active: true, lastActive: "Just now" },
    { id: 2, device: "iPhone 13 Pro", browser: "Safari", location: "Home WiFi", ip: "203.0.113.42", active: false, lastActive: "Yesterday, 8:45 PM" }
];

const AUDIT_LOGS = [
    { id: 1, action: "Attendance submitted", details: "Room A-204 (OS-MCA)", time: "2 hours ago" },
    { id: 2, action: "Login successful", details: "Via Campus SSO", time: "2 hours ago" },
    { id: 3, action: "Swap requested", details: "Exchange with Dr. Smith", time: "1 day ago" },
    { id: 4, action: "Profile updated", details: "Emergency contact changed", time: "3 days ago" },
    { id: 5, action: "Duty assigned", details: "DBMS-BCA (FN Session)", time: "1 week ago" }
];

const TABS = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: Smartphone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audit', label: 'Activity Log', icon: Activity },
];

export default function InvigilatorProfile() {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('personal');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [phone, setPhone] = useState("");
    const [emergency, setEmergency] = useState("");
    const [language, setLanguage] = useState("English");

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await invigilatorService.getDashboardData();
            setProfileData(res.user);
            // Set default values for editable fields
            setPhone("+91 98765 43210");
            setEmergency("+91 98765 43211");
        } catch (err: any) {
            console.error("Failed to fetch profile:", err);
            setError(err.response?.data?.message || err.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // Notification States
    const [notifs, setNotifs] = useState({
        email: true,
        duty: true,
        swap: true,
        emergency: true
    });

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }, 1500);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Loading Profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Profile Error</h2>
                <p className="text-slate-500 max-w-md mb-6">{error}</p>
                <button 
                    onClick={fetchProfile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    <RefreshCcw size={18} /> Retry
                </button>
            </div>
        );
    }

    const userData = profileData || {
        name: authUser?.FullName || "Invigilator",
        role: "Faculty Invigilator",
        department: "General",
        email: authUser?.Email || "email@sjcetpalai.ac.in",
        status: "Active",
        totalDuties: 0,
        lastLogin: "Just now"
    };

    return (
        <div className="min-h-screen bg-[#F5F7FB] text-slate-800 font-sans selection:bg-blue-500/20 selection:text-blue-900 pb-12">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/invigilator/dashboard')} className="text-slate-500 hover:text-blue-600 font-medium text-sm flex items-center gap-1 transition-colors">
                        <ChevronRight className="rotate-180" size={16} /> Back to Dashboard
                    </button>
                </div>
                <h2 className="text-xl font-extrabold text-[#1E2A78]">Account Settings</h2>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* LEFT COLUMN: Profile Summary Card */}
                    <div className="w-full lg:w-80 shrink-0">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-28">
                            <div className="h-32 bg-gradient-to-br from-[#1E2A78] to-[#2F3FA5] relative">
                                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                                    <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg border border-slate-100">
                                        <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-full flex items-center justify-center text-[#2F3FA5]">
                                            <User size={40} className="drop-shadow-sm" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Active"></div>
                                </div>
                            </div>

                            <div className="pt-16 pb-6 px-6 text-center border-b border-slate-100">
                                <h1 className="text-xl font-extrabold text-slate-800">{userData.name}</h1>
                                 <p className="text-sm font-semibold text-blue-600 mt-0.5">{userData.role}</p>
                                 <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                     <Building size={14} /> {userData.department}
                                 </div>
                            </div>

                            <div className="p-6 space-y-4 bg-slate-50/50">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                        <Mail size={14} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</p>
                                        <p className="font-semibold text-slate-700 truncate">{userData.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Duties Completed</p>
                                        <p className="font-bold text-slate-800">{userData.totalDuties || 0} This Year</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                        <Clock size={14} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Login</p>
                                        <p className="font-semibold text-slate-600">{userData.lastLogin}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Content Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Custom Tabs */}
                        <div className="flex overflow-x-auto custom-scrollbar gap-2 mb-6 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap relative ${activeTab === tab.id ? 'text-[#2F3FA5] bg-blue-50/50 shadow-[inset_0_0_0_1px_rgba(47,63,165,0.1)]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="profileTabIndicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[#2F3FA5] rounded-t-full" />
                                    )}
                                    <tab.icon size={18} className={activeTab === tab.id ? 'text-[#2F3FA5]' : 'text-slate-400'} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden">
                            <AnimatePresence mode="wait">

                                {/* 1. PERSONAL INFO TAB */}
                                {activeTab === 'personal' && (
                                    <motion.div
                                        key="personal"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-8"
                                    >
                                        <div>
                                            <h3 className="text-xl font-extrabold text-slate-800">Personal Information</h3>
                                            <p className="text-sm text-slate-500 mt-1 font-medium">Update your contact details and preferences.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Read-only Fields */}
                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Full Name</div>
                                                <input id="input-sh2ds83" name="input-sh2ds83" type="text" disabled value={userData.name} className="w-full bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-semibold opacity-70 cursor-not-allowed" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</div>
                                                <input id="input-zxxqlzq" name="input-zxxqlzq" type="email" disabled value={userData.email} className="w-full bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-semibold opacity-70 cursor-not-allowed" />
                                            </div>

                                            <div className="col-span-1 md:col-span-2 my-2 border-t border-slate-100"></div>

                                            {/* Editable Fields */}
                                            <div className="space-y-2 relative">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5"><Phone size={14} /> Phone Number</div>
                                                <input id="input-vykbdot" name="input-vykbdot" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" />
                                            </div>
                                            <div className="space-y-2 relative">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Emergency Contact</div>
                                                <input id="input-ol9rd52" name="input-ol9rd52" type="tel" value={emergency} onChange={(e) => setEmergency(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5"><Globe size={14} /> Preferred Language</div>
                                                <select id="pref-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full md:w-1/2 bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none appearance-none cursor-pointer">
                                                    <option value="English">English</option>
                                                    <option value="Spanish">Spanish</option>
                                                    <option value="French">French</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving || saveSuccess}
                                                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-md ${saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/30 line-through decoration-transparent' :
                                                        isSaving ? 'bg-[#2F3FA5]/80 text-white cursor-wait' : 'bg-[#2F3FA5] hover:bg-[#1E2A78] text-white shadow-blue-900/20 hover:-translate-y-0.5'
                                                    }`}
                                            >
                                                {isSaving ? <Loader2 size={18} className="animate-spin" /> :
                                                    saveSuccess ? <Check size={18} className="animate-bounce" /> : <Save size={18} />}
                                                {isSaving ? 'Saving Changes...' : saveSuccess ? 'Saved Successfully' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 2. SECURITY TAB */}
                                {activeTab === 'security' && (
                                    <motion.div
                                        key="security"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-8"
                                    >
                                        <div>
                                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><Lock size={22} className="text-[#2F3FA5]" /> Change Password</h3>
                                            <p className="text-sm text-slate-500 mt-1 font-medium">Ensure your account is using a long, random password to stay secure.</p>
                                        </div>

                                        <div className="max-w-md space-y-6">
                                            <div className="space-y-2 relative">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Current Password</div>
                                                <div className="relative">
                                                    <input id="input-ixfkmlt" name="input-ixfkmlt" type={showPassword ? "text" : "password"} className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none pr-12" placeholder="••••••••" />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="my-4 border-t border-slate-100"></div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">New Password</div>
                                                <input id="input-0inzx43" name="input-0inzx43" type={showPassword ? "text" : "password"} className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" placeholder="Enter new password" />
                                            </div>

                                            {/* Password Strength Indicator */}
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="h-1.5 flex-1 rounded-full bg-emerald-500"></div>
                                                    <div className="h-1.5 flex-1 rounded-full bg-emerald-500"></div>
                                                    <div className="h-1.5 flex-1 rounded-full bg-slate-200"></div>
                                                    <div className="h-1.5 flex-1 rounded-full bg-slate-200"></div>
                                                </div>
                                                <p className="text-xs font-semibold text-emerald-600 px-1">Fair strength. Try adding special characters.</p>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Confirm New Password</div>
                                                <input id="input-7py787e" name="input-7py787e" type={showPassword ? "text" : "password"} className="w-full bg-white border border-slate-300 text-slate-800 px-4 py-3 rounded-xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" placeholder="Confirm password" />
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 flex justify-start">
                                            <button className="flex items-center gap-2 px-8 py-3.5 bg-[#2F3FA5] hover:bg-[#1E2A78] text-white rounded-xl font-extrabold text-sm transition-all shadow-md shadow-blue-900/20 hover:-translate-y-0.5">
                                                <KeyRound size={18} /> Update Password
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* 3. SESSIONS TAB */}
                                {activeTab === 'sessions' && (
                                    <motion.div
                                        key="sessions"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-8"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-xl font-extrabold text-slate-800">Active Sessions</h3>
                                                <p className="text-sm text-slate-500 mt-1 font-medium">Manage and logout your active sessions on other devices.</p>
                                            </div>
                                            <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors border border-red-200">
                                                <LogOut size={16} /> Logout All Other Devices
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {SESSIONS.map(session => (
                                                <div key={session.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${session.active ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                            {session.browser === 'Safari' ? <Smartphone size={22} /> : <Globe size={22} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-extrabold text-slate-800">{session.device}</p>
                                                                {session.active && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">Current</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-500">
                                                                <span>{session.browser}</span> • <span>{session.location}</span> • <span>{session.ip}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {!session.active && (
                                                        <button className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Revoke Session">
                                                            <LogOut size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* 4. NOTIFICATIONS TAB */}
                                {activeTab === 'notifications' && (
                                    <motion.div
                                        key="notifications"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-8"
                                    >
                                        <div>
                                            <h3 className="text-xl font-extrabold text-slate-800">Notification Preferences</h3>
                                            <p className="text-sm text-slate-500 mt-1 font-medium">Control how and when you receive alerts from SeatSync.</p>
                                        </div>

                                        <div className="space-y-0 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                            {[
                                                { id: 'email', title: "Email Notifications", desc: "Receive daily summaries and critical alerts via email.", val: notifs.email },
                                                { id: 'duty', title: "Duty Assignments", desc: "Get notified when new duties are assigned to you.", val: notifs.duty },
                                                { id: 'swap', title: "Swap Requests", desc: "Alerts when someone requests a swap or responds to yours.", val: notifs.swap },
                                                { id: 'emergency', title: "Emergency Broadcasts", desc: "Critical alerts from Central Command (Cannot be fully disabled).", val: notifs.emergency, disabled: true },
                                            ].map((item, idx) => (
                                                <div key={item.id} className={`flex items-center justify-between p-5 sm:p-6 ${idx !== 0 ? 'border-t border-slate-100' : ''} ${item.disabled ? 'bg-slate-50/50' : 'hover:bg-slate-50 transition-colors'}`}>
                                                    <div>
                                                        <p className={`font-extrabold ${item.disabled ? 'text-slate-600' : 'text-slate-800'}`}>{item.title}</p>
                                                        <p className="text-xs font-medium text-slate-500 mt-1">{item.desc}</p>
                                                    </div>
                                                    <div className={`relative inline-flex items-center ${item.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                        <input id={`pref-${item.id}`} type="checkbox" className="sr-only peer" checked={item.val} onChange={() => {
                                                            if (!item.disabled) setNotifs({ ...notifs, [item.id]: !item.val })
                                                        }} disabled={item.disabled} />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2F3FA5]"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* 5. ACTIVITY LOG TAB */}
                                {activeTab === 'audit' && (
                                    <motion.div
                                        key="audit"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-8"
                                    >
                                        <div>
                                            <h3 className="text-xl font-extrabold text-slate-800">Activity Report</h3>
                                            <p className="text-sm text-slate-500 mt-1 font-medium">A timeline of your recent actions within the system.</p>
                                        </div>

                                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 py-2">
                                            {AUDIT_LOGS.map((log, idx) => (
                                                <div key={log.id} className="relative pl-6 sm:pl-8">
                                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-blue-500 shadow-sm" />
                                                    <div className="bg-white border text-sm border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div>
                                                                <p className="font-extrabold text-slate-800">{log.action}</p>
                                                                <p className="text-slate-500 font-medium mt-1">{log.details}</p>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 px-2 py-1 rounded border border-slate-100">{log.time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
