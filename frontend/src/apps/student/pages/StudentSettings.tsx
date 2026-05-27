import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Settings, 
    Lock, 
    Eye, 
    Shield, 
    Clock, 
    Laptop,
    Moon,
    Volume2,
    Bell,
    Sun,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentSettings: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { theme, toggleTheme } = useStudentTheme();
    
    // Portal states
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [ambientGlow, setAmbientGlow] = useState(true);

    const isDark = theme === 'dark';

    return (
        <div className="space-y-8 flex flex-col justify-start h-full w-full max-w-4xl mx-auto">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Portal Settings</h1>
                    <p className={`text-sm mt-1.5 font-semibold transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customize your dashboard display preferences and access credentials.</p>
                </div>
            </header>

            <div className="grid md:grid-cols-[240px_1fr] gap-8 items-start">
                {/* Navigation Left menu */}
                <div className="flex flex-col gap-2">
                    <button className={`flex items-center gap-3 px-5 py-3.5 border font-extrabold text-xs uppercase tracking-wider rounded-2xl w-full text-left transition-all duration-300 ${
                        isDark 
                            ? 'bg-slate-900 border-slate-800 text-indigo-400 shadow-md' 
                            : 'bg-white border-slate-200 text-indigo-655 shadow-[0_4px_12px_rgba(0,0,0,0.02)]'
                    }`}>
                        <Settings size={16} /> Preferences
                    </button>
                    <button 
                        onClick={() => navigate('/student/change-password')}
                        className={`flex items-center gap-3 px-5 py-3.5 border font-extrabold text-xs uppercase tracking-wider rounded-2xl w-full text-left transition-all duration-300 ${
                            isDark 
                                ? 'bg-transparent border-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200' 
                                : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-500 hover:text-slate-800 shadow-none hover:shadow-sm'
                        }`}
                    >
                        <Lock size={16} /> Reset Password
                    </button>
                </div>

                {/* Right Configuration panel */}
                <div className="space-y-6">
                    {/* Visual Configuration */}
                    <section className={`rounded-3xl border p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6 transition-colors duration-500 ${
                        isDark ? 'bg-[#0C1220]/80 border-slate-800/85' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                                <Laptop size={18} />
                            </div>
                            <h3 className={`text-xs font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Appearance preferences</h3>
                        </div>

                        <div className="space-y-6">
                            <ToggleItem 
                                icon={isDark ? Moon : Sun}
                                title="Dark theme active" 
                                description="Optimize UI layout for low-light terminal operation."
                                checked={isDark}
                                onChange={toggleTheme}
                                isDark={isDark}
                            />
                            <ToggleItem 
                                icon={Eye}
                                title="Dynamic Ambient Glows" 
                                description="Enable smooth background radial aurora visual assets."
                                checked={ambientGlow}
                                onChange={setAmbientGlow}
                                isDark={isDark}
                            />
                        </div>
                    </section>

                    {/* Bulletins Configuration */}
                    <section className={`rounded-3xl border p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6 transition-colors duration-500 ${
                        isDark ? 'bg-[#0C1220]/80 border-slate-800/85' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                isDark ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-100'
                            }`}>
                                <Bell size={18} />
                            </div>
                            <h3 className={`text-xs font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Alert Configurations</h3>
                        </div>

                        <div className="space-y-6">
                            <ToggleItem 
                                icon={Bell}
                                title="Real-time bulletins push" 
                                description="Deliver instant seat releases and emergency room shifts."
                                checked={pushEnabled}
                                onChange={setPushEnabled}
                                isDark={isDark}
                            />
                            <ToggleItem 
                                icon={Volume2}
                                title="Audible notifications" 
                                description="Play audio ping logs on priority bulletin arrivals."
                                checked={soundEnabled}
                                onChange={setSoundEnabled}
                                isDark={isDark}
                            />
                        </div>
                    </section>

                    {/* Security Info */}
                    <section className={`rounded-3xl border p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-6 transition-colors duration-500 ${
                        isDark ? 'bg-[#0C1220]/80 border-slate-800/85' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                                <Shield size={18} />
                            </div>
                            <h3 className={`text-xs font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Security Profile</h3>
                        </div>

                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border text-xs transition-colors duration-500 ${
                            isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                                    isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-750 border-emerald-100'
                                }`}>
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <p className={`font-extrabold transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Active Terminal Session</p>
                                    <p className={`text-[10px] font-semibold mt-0.5 transition-colors duration-500 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Securely logged in to SeatSync</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit">
                                Connected
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const ToggleItem = ({ icon: Icon, title, description, checked, onChange, disabled, isDark }: any) => (
    <div className="flex items-start justify-between gap-4 p-1">
        <div className="flex gap-3">
            {Icon && (
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                    <Icon size={16} />
                </div>
            )}
            <div>
                <p className={`font-extrabold text-sm transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</p>
                <p className={`text-xs mt-1.5 leading-relaxed font-semibold transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
            </div>
        </div>
        <button
            onClick={() => !disabled && onChange && onChange(!checked)}
            disabled={disabled}
            className={`w-12 h-6.5 rounded-full transition-all duration-300 relative shrink-0 focus:outline-none cursor-pointer border ${
                checked 
                    ? 'bg-indigo-600 border-indigo-700 dark:bg-indigo-500 dark:border-indigo-600' 
                    : 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all duration-300 shadow-[0_2px_5px_rgba(0,0,0,0.22)] ${
                checked ? 'left-[24px]' : 'left-[4px]'
            }`} />
        </button>
    </div>
);

export default StudentSettings;
