import React from 'react';
import { UserProfile } from '../../../../types/auth';
import { motion } from 'framer-motion';
import {
    ShieldCheck,
    GraduationCap,
    User
} from 'lucide-react';

interface ProfileHeaderCardProps {
    profile: UserProfile;
}

const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({ profile }) => {
    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'exam_admin':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Administrator
                    </span>
                );
            case 'invigilator':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        <User className="w-3.5 h-3.5" />
                        Invigilator
                    </span>
                );
            case 'student':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Student
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {role}
                    </span>
                );
        }
    };

    const formattedDate = new Date(profile.CreatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full opacity-50 -z-0" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Avatar */}
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-200">
                        {profile.FullName ? profile.FullName.charAt(0).toUpperCase() : (profile.Email ? profile.Email.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <div className="absolute inset-0 rounded-full ring-4 ring-white/30 group-hover:ring-white/50 transition-all duration-300" />
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {profile.FullName || 'User'}
                        </h1>
                        <p className="text-gray-500 font-medium">{profile.Email}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        {getRoleBadge(profile.Role)}

                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${profile.IsActive
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            {profile.IsActive ? 'Active' : 'Disabled'}
                        </span>
                    </div>

                    <div className="text-sm text-gray-400 font-medium pt-1">
                        Member since: {formattedDate}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ProfileHeaderCard;
