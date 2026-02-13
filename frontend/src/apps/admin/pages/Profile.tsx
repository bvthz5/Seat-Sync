import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { UserProfile } from '../../../types/auth';
import { AuthService } from '../../../services/auth.service';
import ProfileHeaderCard from '../components/profile/ProfileHeaderCard';
import PersonalInfoForm from '../components/profile/PersonalInfoForm';
import SecuritySettingsCard from '../components/profile/SecuritySettingsCard';
import GlobalLoader from '../../../components/GlobalLoader';
import { toast } from 'react-hot-toast';

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchProfile = useCallback(async () => {
        try {
            const data = await AuthService.getProfile();
            setProfile(data);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    }, [user, navigate]); // Added dependencies although fetchProfile itself might not depend on them directly unless access check was inside.

    useEffect(() => {
        if (!user) return;

        // Strict access check: Only Exam Admins and Root Admins
        if (user.Role !== 'exam_admin' && !user.IsRootAdmin) {
            toast.error("Access restricted: Administrators only.");
            navigate('/dashboard'); // or appropriate fallback
            return;
        }

        fetchProfile();
    }, [user, navigate, fetchProfile]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><GlobalLoader /></div>;
    }

    if (!profile) {
        return <div className="text-center p-8 text-gray-500">Profile not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 space-y-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <ProfileHeaderCard profile={profile} />

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Personal Info (2/3 width on large screens) */}
                    <div className="lg:col-span-2">
                        <PersonalInfoForm profile={profile} onUpdate={fetchProfile} />
                    </div>

                    {/* Right Column: Security Settings (1/3 width) */}
                    <div className="lg:col-span-1">
                        <SecuritySettingsCard profile={profile} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
