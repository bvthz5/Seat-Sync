import React, { useState, useEffect } from 'react';
import { 
    User, 
    Mail, 
    Phone, 
    Calendar, 
    BookOpen, 
    Award, 
    Clock, 
    Shield, 
    Camera, 
    Edit2, 
    Save, 
    X, 
    CheckCircle2, 
    Loader2,
    UserCircle,
    VenusAndMars
} from 'lucide-react';
import { studentPortalApi } from '../services/studentPortal';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentProfile: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: ''
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { theme } = useStudentTheme();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await studentPortalApi.getProfile();
            setProfileData(data);
            setFormData({
                fullName: data.personal.fullName || '',
                email: data.personal.email || '',
                phone: data.personal.phone || '',
                dateOfBirth: data.personal.dateOfBirth || '',
                gender: data.personal.gender || ''
            });
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await studentPortalApi.updateProfile(formData);
            await fetchProfile();
            setEditMode(false);
            setSuccessMessage('Profile updated successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Failed to update profile:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            
            // Compress image before upload
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress as JPEG
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                try {
                    setSaving(true);
                    await studentPortalApi.uploadAvatar(compressedBase64);
                    await fetchProfile();
                } catch (err) {
                    console.error('Failed to upload avatar:', err);
                } finally {
                    setSaving(false);
                }
            };
            img.src = base64;
        };
        reader.readAsDataURL(file);
    };

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4" size={28} />
                <p className="text-indigo-600 dark:text-indigo-300/60 font-black uppercase tracking-[0.25em] text-[10px]">Retrieving Profile...</p>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="max-w-md mx-auto py-20 text-center px-6">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                    <X size={28} />
                </div>
                <h2 className={`text-xl font-black mb-2 transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Error Syncing Profile</h2>
                <p className="text-slate-400 mb-6 text-xs font-semibold">We couldn't retrieve your credentials. Please try refreshing.</p>
                <button 
                    onClick={() => fetchProfile()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all shadow-md"
                >
                    Retry loading
                </button>
            </div>
        );
    }

    const { personal, academic, account } = profileData;
    const initials = personal.fullName
        ? personal.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'S';

    return (
        <div className="space-y-8 flex flex-col justify-start h-full w-full max-w-5xl mx-auto">
            {/* Profile Hero Spotlight Card */}
            <header className={`rounded-[2rem] border p-8 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-colors duration-500 ${
                isDark ? 'bg-[#0C1220]/80 border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Avatar Block */}
                    <div className="relative group shrink-0">
                        <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] border-2 shadow-2xl overflow-hidden flex items-center justify-center ring-4 ring-indigo-500/10 transition-colors duration-500 ${
                            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                            {personal.avatar ? (
                                <img src={personal.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle size={64} className="text-slate-400 dark:text-slate-700" />
                            )}
                        </div>
                        <label className="absolute bottom-1 right-1 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 border border-slate-800">
                            <Camera size={14} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>

                    <div className="flex-1 text-center md:text-left min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 justify-center md:justify-start">
                            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight truncate transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {personal.fullName}
                            </h1>
                            <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5 mx-auto md:mx-0 ${
                                account.isActive 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' 
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                            }`}>
                                <div className={`w-1 h-1 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                {account.isActive ? 'ACTIVE STUDENT' : 'INACTIVE'}
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-y-3 gap-x-6 text-slate-500 dark:text-slate-400 font-medium text-xs">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-indigo-500 dark:text-indigo-400" />
                                <span className={`font-semibold transition-colors duration-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{academic.registerNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award size={14} className="text-indigo-500 dark:text-indigo-400" />
                                <span className={`font-semibold transition-colors duration-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{academic.program || 'Program TBD'} {academic.semester ? `• Sem ${academic.semester}` : ''}</span>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex gap-3 w-full md:w-auto">
                        {editMode ? (
                            <>
                                <button 
                                    onClick={() => setEditMode(false)}
                                    className={`flex-1 md:flex-initial px-5 py-3 rounded-xl border font-extrabold text-xs uppercase tracking-wider transition-colors ${
                                        isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 md:flex-initial px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setEditMode(true)}
                                className={`w-full md:w-auto px-6 py-3 border font-extrabold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Edit2 size={14} />
                                Edit Credentials
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-5 py-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold animate-pulse">
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <section className={`rounded-3xl border overflow-hidden flex flex-col shadow-xl backdrop-blur-xl transition-colors duration-500 ${
                    isDark ? 'bg-[#0C1220]/80 border-slate-800/85' : 'bg-white border-slate-200'
                }`}>
                    <div className={`px-6 py-4.5 border-b flex items-center gap-3 transition-colors duration-500 ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                            isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                            <User size={16} />
                        </div>
                        <h3 className={`text-xs font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Personal Records</h3>
                    </div>
                    
                    <div className="p-6 sm:p-8 space-y-6 flex-1">
                        <ProfileField 
                            icon={User} 
                            label="Full Name" 
                            value={formData.fullName} 
                            isEdit={editMode}
                            onChange={(val) => setFormData({...formData, fullName: val})}
                            isDark={isDark}
                        />
                        <ProfileField 
                            icon={Mail} 
                            label="Institutional Email" 
                            value={formData.email} 
                            isEdit={editMode}
                            onChange={(val) => setFormData({...formData, email: val})}
                            isDark={isDark}
                        />
                        <ProfileField 
                            icon={Phone} 
                            label="Phone Number" 
                            value={formData.phone} 
                            isEdit={editMode}
                            placeholder="Not registered"
                            onChange={(val) => setFormData({...formData, phone: val})}
                            isDark={isDark}
                        />
                        <div className="grid sm:grid-cols-2 gap-6">
                            <ProfileField 
                                icon={Calendar} 
                                label="Date of Birth" 
                                value={formData.dateOfBirth} 
                                type="date"
                                isEdit={editMode}
                                onChange={(val: string) => setFormData({...formData, dateOfBirth: val})}
                                isDark={isDark}
                            />
                            <ProfileField 
                                icon={VenusAndMars} 
                                label="Gender" 
                                value={formData.gender} 
                                type="select"
                                options={['Male', 'Female', 'Other']}
                                isEdit={editMode}
                                onChange={(val: string) => setFormData({...formData, gender: val})}
                                isDark={isDark}
                            />
                        </div>
                    </div>
                </section>

                {/* Academic Records */}
                <section className={`rounded-3xl border overflow-hidden flex flex-col shadow-xl backdrop-blur-xl transition-colors duration-500 ${
                    isDark ? 'bg-[#0C1220]/80 border-slate-800/85' : 'bg-white border-slate-200'
                }`}>
                    <div className={`px-6 py-4.5 border-b flex items-center justify-between transition-colors duration-500 ${
                        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-100'
                            }`}>
                                <BookOpen size={16} />
                            </div>
                            <h3 className={`text-xs font-black uppercase tracking-wider transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Academic Identity</h3>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-lg transition-colors duration-500 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>LOCKED</span>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6 flex-1">
                        <div className="grid sm:grid-cols-2 gap-6">
                            <DisplayField label="Register Number" value={academic.registerNumber} isDark={isDark} />
                            <DisplayField label="Department" value={academic.department} isDark={isDark} />
                        </div>
                        <DisplayField label="Program of Study" value={academic.program} isDark={isDark} />
                        <div className="grid sm:grid-cols-3 gap-6">
                            <DisplayField label="Current Semester" value={academic.semester ? `Semester ${academic.semester}` : '—'} isDark={isDark} />
                            <DisplayField label="Batch Year" value={academic.batchYear} isDark={isDark} />
                            <DisplayField label="Status" value={academic.status} highlight isDark={isDark} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

const ProfileField = ({ icon: Icon, label, value, isEdit, onChange, type = 'text', options = [], placeholder, isDark }: any) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isEdit ? 'text-indigo-400' : 'text-slate-500'}`}>
                <Icon size={16} />
            </div>
            {isEdit ? (
                type === 'select' ? (
                    <select 
                        value={value} 
                        onChange={(e) => onChange(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 border rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none text-xs ${
                            isDark ? 'bg-[#070B13] border-indigo-500/20 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                    >
                        <option value="">Select {label}</option>
                        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input 
                        type={type}
                        value={value}
                        placeholder={placeholder}
                        onChange={(e) => onChange(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 border rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs ${
                            isDark ? 'bg-[#070B13] border-indigo-500/20 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                    />
                )
            ) : (
                <div className={`w-full pl-11 pr-4 py-3 rounded-xl border text-xs transition-colors duration-500 ${
                    isDark ? 'bg-slate-900/60 border-slate-900 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                    {value || <span className="text-slate-400 dark:text-slate-600 italic font-medium">{placeholder || 'Not specified'}</span>}
                </div>
            )}
        </div>
    </div>
);

const DisplayField = ({ label, value, highlight, isDark }: any) => (
    <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className="px-1.5 py-0.5">
            <span className={`text-xs font-extrabold transition-colors duration-500 ${
                highlight ? 'text-indigo-600 dark:text-indigo-400' : isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>{value || '—'}</span>
        </div>
    </div>
);

export default StudentProfile;
