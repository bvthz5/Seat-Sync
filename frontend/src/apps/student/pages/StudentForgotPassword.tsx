import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [shake, setShake] = useState(false);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email || !email.includes('@')) {
            toast.error("Please enter a valid college email");
            triggerShake();
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/student/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            // Success state UI
            setIsSuccess(true);
            if (data.debugToken) { // Mock feature since we don't have email server active
                toast.success(`Debug: Token is ${data.debugToken}`, { duration: 6000 });
            }

        } catch (error: any) {
            toast.error(error.message);
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] p-4 relative overflow-hidden font-inter">
            {/* Background blob */}
            <div className="absolute top-0 right-0 -mr-[300px] -mt-[300px] w-[800px] h-[800px] bg-blue-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>

            <div className={`relative w-full max-w-[420px] bg-white rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-gray-100 p-8 ${shake ? 'animate-shake' : ''}`}>
                
                <Link to="/student/login" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
                        <KeyRound className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Forgot Password?</h1>
                    <p className="text-sm text-gray-500 px-4">
                        {isSuccess 
                            ? "Check your email inbox for a secure token to reset your password."
                            : "Enter the email associated with your account and we'll send you a recovery link."}
                    </p>
                </div>

                {isSuccess ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-center">
                            <p className="text-sm text-green-800 font-medium tracking-tight">Recovery email sent to <strong className="font-bold">{email}</strong></p>
                        </div>
                        <button
                            onClick={() => navigate('/student/reset-password')}
                            className="w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
                        >
                            Proceed to Reset
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleForgot} className="space-y-6">
                        <div className="relative group">
                            <div className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 ml-1">
                                Email Address
                            </div>
                            <div className="relative flex items-center transition-all duration-300">
                                <div className="absolute left-4 text-gray-400 group-focus-within:text-blue-600">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block pl-12 pr-4 py-3.5 transition-all"
                                    placeholder="johndoe@college.edu"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-70 transition-all shadow-lg shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span>Send Reset Link</span>
                            )}
                        </button>
                    </form>
                )}
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

export default StudentForgotPassword; // Trigger file watcher
