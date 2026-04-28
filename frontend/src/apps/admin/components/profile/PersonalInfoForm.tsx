
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../../types/auth'; // Ensure path is correct
import { motion } from 'framer-motion';
import { AuthService } from '../../../../services/auth.service';
import { toast } from 'react-hot-toast';

interface PersonalInfoFormProps {
    profile: UserProfile;
    onUpdate: () => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ profile, onUpdate }) => {
    const [formData, setFormData] = useState({
        FullName: profile.FullName || '',
    });

    useEffect(() => {
        setFormData({
            FullName: profile.FullName || '',
        });
    }, [profile]);

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.FullName.trim()) {
            newErrors.FullName = 'Full Name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error on change
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            await AuthService.updateProfile(formData);
            toast.success('Profile updated successfully');
            onUpdate();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-1 md:col-span-2">
                        <div className="block text-sm font-medium text-gray-700">Full Name</div>
                        <input
                            id="profile-fullname"
                            type="text"
                            name="FullName"
                            value={formData.FullName}
                            onChange={handleChange}
                            autoComplete="name"
                            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.FullName ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'
                                }`}
                        />
                        {errors.FullName && <p className="text-xs text-red-500">{errors.FullName}</p>}
                    </div>

                    {/* College Email (Read-only) */}
                    <div className="space-y-1">
                        <div className="block text-sm font-medium text-gray-500">College Email</div>
                        <input
                            id="profile-email"
                            name="Email"
                            type="email"
                            value={profile.Email}
                            disabled
                            autoComplete="email"
                            className="w-full px-4 py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    {/* Role (Read-only) */}
                    <div className="space-y-1">
                        <div className="block text-sm font-medium text-gray-500">Role</div>
                        <input
                            id="profile-role"
                            name="Role"
                            type="text"
                            value={profile.Role.charAt(0).toUpperCase() + profile.Role.slice(1).replace('_', ' ')}
                            disabled
                            autoComplete="off"
                            className="w-full px-4 py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <button
                        type="button"
                        onClick={onUpdate}
                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default PersonalInfoForm;
