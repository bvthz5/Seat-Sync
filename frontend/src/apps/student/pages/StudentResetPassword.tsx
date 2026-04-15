import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, RectangleEllipsis, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        // Auto-fill token if passed in URL query e.g. /student/reset-password?token=XYZ
        const searchParams = new URLSearchParams(location.search);
        const urlToken = searchParams.get('token');
        if (urlToken) {
            setToken(urlToken);
        }
    }, [location]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            triggerShake();
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            triggerShake();
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            triggerShake();
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/student/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Password reset failed');
            }

            toast.success("Password reset securely. You can now login.", { duration: 4000 });
            navigate('/student/login');

        } catch (error: any) {
            toast.error(error.message);
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] p-4 relative overflow-hidden font-inter">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-[200px] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60"></div>
                <div className="absolute bottom-0 right-[10%] w-[500px] h-[500px] bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60"></div>
            </div>

            <div className={`relative w-full max-w-[420px] bg-white rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-gray-100 p-8 ${shake ? 'animate-shake' : ''}`}>
                
                <Link to="/student/login" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-purple-100 to-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100/50">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Create New Password</h1>
                    <p className="text-sm text-gray-500">Your new password must be securely formed.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-5">
                    <div className="relative group">
                        <div className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 ml-1">
                                Reset Token
                            </div>
                        <div className="relative flex items-center transition-all duration-300">
                            <div className="absolute left-4 text-gray-400 group-focus-within:text-indigo-600">
                                <RectangleEllipsis className="w-5 h-5" />
                            </div>
                            <input
                                 id="reset-token" type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-12 pr-4 py-3.5 transition-all"
                                placeholder="Paste token here..."
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 ml-1">
                                New Password
                            </div>
                        <div className="relative flex items-center transition-all duration-300">
                            <div className="absolute left-4 text-gray-400 group-focus-within:text-indigo-600">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <input
                                 id="new-password" type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-12 pr-4 py-3.5 transition-all"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 ml-1">
                                Confirm Password
                            </div>
                        <div className="relative flex items-center transition-all duration-300">
                            <div className="absolute left-4 text-gray-400 group-focus-within:text-indigo-600">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                 id="confirm-password" type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-12 pr-4 py-3.5 transition-all"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-500/30 disabled:opacity-70 transition-all shadow-lg shadow-indigo-500/25"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span>Reset Password</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};

export default StudentResetPassword;
