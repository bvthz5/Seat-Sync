import React, { useState } from 'react';
import { UserProfile } from '../../../../types/auth'; // Ensure this path is correct relative to the file
import { motion } from 'framer-motion';
import { Shield, Key, History, Laptop } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

interface SecuritySettingsCardProps {
    profile: UserProfile;
    defaultOpenPasswordModal?: boolean;
}

const SecuritySettingsCard: React.FC<SecuritySettingsCardProps> = ({ profile, defaultOpenPasswordModal = false }) => {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(defaultOpenPasswordModal);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-full"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
            </div>

            <div className="space-y-6">
                {/* Change Password */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-gray-500">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Password</h3>
                            <p className="text-sm text-gray-500">Last changed: Never</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Change
                    </button>
                </div>

                {/* Last Login Info */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-400" />
                        Login Activity
                    </h3>

                    <div className="relative pl-6 border-l-2 border-gray-100 space-y-4">
                        {/* Mock Data */}
                        <div className="relative">
                            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                            <p className="text-sm font-medium text-gray-900">Current Session</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Laptop className="w-3 h-3" />
                                <span>Chrome on Windows</span>
                                <span>•</span>
                                <span>{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>

                        <div className="relative opacity-60">
                            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
                            <p className="text-sm font-medium text-gray-900">Last Login</p>
                            <p className="text-xs text-gray-500 mt-1">Feb 11, 2026 at 10:30 AM</p>
                        </div>
                    </div>
                </div>
            </div>

            {isPasswordModalOpen && (
                <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />
            )}
        </motion.div>
    );
};

export default SecuritySettingsCard;
