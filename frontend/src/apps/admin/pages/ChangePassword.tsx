import React, { useState } from 'react';
import { Button, Card, CardHeader, CardBody, Input } from '@heroui/react';
import { motion } from 'framer-motion';
import { AuthService } from '../../../services/auth.service';

const ChangePassword: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await AuthService.changePassword(currentPassword, newPassword);
            setMessage('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to change password. check your current password.');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div
            className="p-8 max-w-[1600px] mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="mb-10 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Security Settings</h1>
                <p className="text-slate-500 mt-2 text-sm font-medium">Update your access credentials.</p>
            </div>

            <div className="max-w-xl">
                <Card className="border-none shadow-lg bg-white p-2">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
                    </CardHeader>
                    <CardBody className="px-6 pb-6">
                        {message && (
                            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold">
                                {message}
                            </div>
                        )}
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <Input
                                label="Current Password"
                                placeholder="Enter current password"
                                type="password"
                                variant="bordered"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                isRequired
                            />

                            <Input
                                label="New Password"
                                placeholder="Enter new strong password"
                                type="password"
                                variant="bordered"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                isRequired
                            />

                            <Input
                                label="Confirm New Password"
                                placeholder="Confirm new password"
                                type="password"
                                variant="bordered"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                isRequired
                            />

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    color="primary"
                                    size="lg"
                                    isLoading={loading}
                                    className="font-bold shadow-lg shadow-blue-500/30"
                                >
                                    Update Password
                                </Button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </motion.div>
    );
};

export default ChangePassword;
