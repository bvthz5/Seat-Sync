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
    LogOut,
    Key,
    UserCircle,
    VenusAndMars
} from 'lucide-react';
import { studentPortalApi } from '../services/studentPortal';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const StudentProfile: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
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
            try {
                setSaving(true);
                await studentPortalApi.uploadAvatar(base64);
                await fetchProfile();
            } catch (err) {
                console.error('Failed to upload avatar:', err);
            } finally {
                setSaving(false);
            }
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Loading your profile...</p>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                    <X size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Failed to Load Profile</h2>
                <p className="text-slate-500 max-w-xs mx-auto mb-8">We couldn't retrieve your profile data. Please check your connection and try again.</p>
                <button 
                    onClick={() => fetchProfile()}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    const { personal, academic, account } = profileData;

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* PROFILE HERO HEADER */}
            <header className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-12 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-50/20 rounded-full -ml-32 -mb-32 blur-3xl" />
                
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    {/* Avatar with Upload */}
                    <div className="relative group">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center ring-1 ring-slate-100">
                            {personal.avatar ? (
                                <img src={personal.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle size={80} className="text-slate-300" />
                            )}
                        </div>
                        <label className="absolute bottom-2 right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 ring-2 ring-white">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 justify-center md:justify-start">
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                                {personal.fullName}
                            </h1>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border inline-flex items-center gap-2 mx-auto md:mx-0 ${
                                account.isActive 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${account.isActive ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                {account.isActive ? 'Active Student' : 'Inactive'}
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-y-4 gap-x-8 text-slate-500 font-medium">
                            <div className="flex items-center gap-2.5">
                                <Shield size={16} className="text-indigo-400" />
                                <span>{academic.registerNumber}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Award size={16} className="text-indigo-400" />
                                <span>{academic.program || 'Program TBD'} {academic.semester ? `• Sem ${academic.semester}` : ''}</span>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex gap-4">
                        {editMode ? (
                            <>
                                <button 
                                    onClick={() => setEditMode(false)}
                                    className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setEditMode(true)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Edit2 size={18} />
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 size={20} />
                    <span className="font-bold">{successMessage}</span>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-10">
                {/* PERSONAL INFORMATION CARD */}
                <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <User size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
                        </div>
                    </div>
                    
                    <div className="p-10 space-y-8 flex-1">
                        <ProfileField 
                            icon={User} 
                            label="Full Name" 
                            value={formData.fullName} 
                            isEdit={editMode}
                            onChange={(val) => setFormData({...formData, fullName: val})}
                        />
                        <ProfileField 
                            icon={Mail} 
                            label="Institutional Email" 
                            value={formData.email} 
                            isEdit={editMode}
                            onChange={(val) => setFormData({...formData, email: val})}
                        />
                        <ProfileField 
                            icon={Phone} 
                            label="Phone Number" 
                            value={formData.phone} 
                            isEdit={editMode}
                            placeholder="Not provided"
                            onChange={(val) => setFormData({...formData, phone: val})}
                        />
                        <div className="grid sm:grid-cols-2 gap-8">
                            <ProfileField 
                                icon={Calendar} 
                                label="Date of Birth" 
                                value={formData.dateOfBirth} 
                                type="date"
                                isEdit={editMode}
                                onChange={(val: string) => setFormData({...formData, dateOfBirth: val})}
                            />
                            <ProfileField 
                                icon={VenusAndMars} 
                                label="Gender" 
                                value={formData.gender} 
                                type="select"
                                options={['Male', 'Female', 'Other']}
                                isEdit={editMode}
                                onChange={(val: string) => setFormData({...formData, gender: val})}
                            />
                        </div>
                    </div>
                </section>

                {/* ACADEMIC DETAILS CARD */}
                <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                <BookOpen size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Academic Info</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">READ ONLY</span>
                    </div>

                    <div className="p-10 space-y-8 flex-1">
                        <div className="grid sm:grid-cols-2 gap-10">
                            <DisplayField label="Register Number" value={academic.registerNumber} />
                            <DisplayField label="Department" value={academic.department} />
                        </div>
                        <DisplayField label="Program of Study" value={academic.program} />
                        <div className="grid sm:grid-cols-3 gap-10">
                            <DisplayField label="Current Semester" value={academic.semester ? `Semester ${academic.semester}` : 'Not Set'} />
                            <DisplayField label="Batch Year" value={academic.batchYear} />
                            <DisplayField label="Status" value={academic.status} highlight />
                        </div>
                    </div>
                </section>

                {/* ACCOUNT & SECURITY CARD */}
                <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Account Security</h3>
                        </div>
                    </div>

                    <div className="p-10 grid md:grid-cols-3 gap-12">
                        <div className="space-y-6">
                            <DisplayField icon={User} label="Username" value={account.username} />
                            <DisplayField 
                                icon={Clock} 
                                label="Member Since" 
                                value={account.createdAt ? new Date(account.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'N/A'} 
                            />
                        </div>

                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 justify-center md:justify-end items-center">
                            <button 
                                onClick={() => navigate('/student/change-password')}
                                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all hover:border-indigo-200"
                            >
                                <Key size={20} className="text-indigo-500" />
                                Change Portal Password
                            </button>
                            <button 
                                onClick={() => logout()}
                                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-all border border-rose-100"
                            >
                                <LogOut size={20} />
                                Logout Session
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

const ProfileField = ({ icon: Icon, label, value, isEdit, onChange, type = 'text', options = [], placeholder }: any) => (
    <div className="space-y-2.5">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isEdit ? 'text-indigo-400' : 'text-slate-300'}`}>
                <Icon size={18} />
            </div>
            {isEdit ? (
                type === 'select' ? (
                    <select 
                        value={value} 
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all appearance-none"
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
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all"
                    />
                )
            ) : (
                <div className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-transparent text-slate-600 font-bold">
                    {value || <span className="text-slate-300 italic font-medium">{placeholder || 'Not specified'}</span>}
                </div>
            )}
        </div>
    </div>
);

const DisplayField = ({ icon: Icon, label, value, highlight }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="flex items-center gap-3 px-1">
            {Icon && <Icon size={16} className="text-slate-300" />}
            <span className={`text-sm font-bold ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value || '—'}</span>
        </div>
    </div>
);

export default StudentProfile;
