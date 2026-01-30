import React, { useState } from 'react';
import { Button, Card, CardBody, Input } from '@heroui/react';
import { motion } from 'framer-motion';
import { AuthService } from '../../../services/auth.service';
import {
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';

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

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
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
            className="p-8 max-w-[1600px] mx-auto space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Security Settings</h1>
                <p className="text-slate-500 mt-2 text-base">Update your access credentials to keep your account safe.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Change Password Form */}
                <div className="lg:col-span-2">
                    <Card className="border-none shadow-sm bg-white p-6 h-full">
                        <CardBody className="p-4">
                            <h3 className="text-xl font-bold text-slate-800 mb-8">Change Password</h3>

                            {message && (
                                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    {message}
                                </div>
                            )}
                            {error && (
                                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-xl">
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</p>
                                        <Input
                                            placeholder="Enter existing password"
                                            type="password"
                                            variant="underlined"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            classNames={{
                                                input: "text-base text-slate-700",
                                                inputWrapper: "border-slate-200 hover:border-slate-400 focus-within:!border-blue-600"
                                            }}
                                            isRequired
                                        />
                                    </div>

                                    <div className="space-y-1 mt-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</p>
                                        <Input
                                            placeholder="Create a strong password"
                                            type="password"
                                            variant="underlined"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            classNames={{
                                                input: "text-base text-slate-700",
                                                inputWrapper: "border-slate-200 hover:border-slate-400 focus-within:!border-blue-600"
                                            }}
                                            isRequired
                                        />
                                    </div>

                                    <div className="space-y-1 mt-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</p>
                                        <Input
                                            placeholder="Repeat your new password"
                                            type="password"
                                            variant="underlined"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            classNames={{
                                                input: "text-base text-slate-700",
                                                inputWrapper: "border-slate-200 hover:border-slate-400 focus-within:!border-blue-600"
                                            }}
                                            isRequired
                                        />
                                        {confirmPassword !== '' && newPassword !== confirmPassword && (
                                            <p className="text-xs text-red-500 font-bold mt-1">Passwords do not match</p>
                                        )}
                                        {confirmPassword !== '' && newPassword === confirmPassword && (
                                            <p className="text-xs text-green-600 font-bold mt-1">Passwords match</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        color="primary"
                                        size="lg"
                                        isLoading={loading}
                                        className="font-bold px-8 bg-blue-900 text-white shadow-lg shadow-blue-900/20"
                                        radius="sm"
                                    >
                                        Update Password
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>

                {/* Right Column: Password Requirements */}
                <div className="lg:col-span-1">
                    <Card className="border-none shadow-none bg-blue-50/50 h-full">
                        <CardBody className="p-8 flex flex-col items-center text-center justify-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
                                <ShieldCheck size={32} strokeWidth={1.5} />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-6">Password Requirements</h3>

                            <div className="space-y-4 w-full text-left max-w-xs mx-auto">
                                <RequirementItem text="Minimum 8 characters long" />
                                <RequirementItem text="Include at least one uppercase letter" />
                                <RequirementItem text="Include at least one symbol or number" />
                                <RequirementItem text="Avoid common phrases or birthdays" />
                            </div>

                            <div className="mt-10 text-xs text-slate-500">
                                Need help? <button className="text-blue-700 font-bold hover:underline">Contact support</button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>

        </motion.div>
    );
};

const RequirementItem = ({ text }: { text: string }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 min-w-[16px]">
            <CheckCircle2 size={16} className="text-green-500" />
        </div>
        <span className="text-sm text-slate-500 font-medium leading-tight">{text}</span>
    </div>
);


export default ChangePassword;
