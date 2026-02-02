import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    UserPlus,
    Shield,
    ShieldOff,
    Key,
    Trash2,
    Activity,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminManagementService } from '../services/adminManagementService';
import CreateAdminModal from '../components/CreateAdminModal';
import ConfirmationModal from '../components/ConfirmationModal';

interface Admin {
    UserID: number;
    Email: string;
    FullName: string | null;
    Role: string;
    IsRootAdmin: boolean;
    IsActive: boolean;
    CreatedAt: string;
}

interface DashboardStats {
    totalAdmins: number;
    activeAdmins: number;
    rootAdmins: number;
}

const AdminManagement: React.FC = () => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [stats, setStats] = useState<DashboardStats>({ totalAdmins: 0, activeAdmins: 0, rootAdmins: 0 });

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Confirmation State
    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger',
        action: async () => { }
    });

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [page, searchTerm, statusFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsData, adminsData] = await Promise.all([
                AdminManagementService.getStats(),
                AdminManagementService.getAllAdmins({
                    page,
                    limit: LIMIT,
                    search: searchTerm,
                    status: statusFilter !== 'all' ? statusFilter : undefined
                })
            ]);

            setStats(statsData.data);
            setAdmins(adminsData.data.admins);
            setTotalPages(adminsData.data.totalPages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch admin data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (data: { email: string; fullName: string }) => {
        try {
            await AdminManagementService.createAdmin(data);
            toast.success('Admin created successfully');
            fetchData(); // Refresh list and stats
        } catch (error: any) {
            // Error managed in modal generally, but here if needed
            throw error;
        }
    };

    const handleToggleStatus = (admin: Admin) => {
        if (admin.IsRootAdmin) return;

        setConfirmAction({
            isOpen: true,
            title: admin.IsActive ? 'Disable Admin' : 'Enable Admin',
            message: `Are you sure you want to ${admin.IsActive ? 'disable' : 'enable'} access for ${admin.Email}?`,
            type: admin.IsActive ? 'warning' : 'info',
            action: async () => {
                try {
                    await AdminManagementService.toggleStatus(admin.UserID, !admin.IsActive);
                    toast.success(`Admin ${admin.IsActive ? 'disabled' : 'enabled'} successfully`);
                    fetchData();
                } catch (error: any) {
                    toast.error(error.response?.data?.message || 'Failed to update admin status');
                    throw error;
                }
            }
        });
    };

    const handleResetPassword = (admin: Admin) => {
        setConfirmAction({
            isOpen: true,
            title: 'Reset Password',
            message: `This will generate a new random password for ${admin.Email} and send it via email. The old password will stop working immediately.`,
            type: 'warning',
            action: async () => {
                try {
                    await AdminManagementService.resetPassword(admin.UserID);
                    toast.success('Password reset successfully. Email sent.');
                } catch (error: any) {
                    toast.error(error.response?.data?.message || 'Failed to reset password');
                    throw error;
                }
            }
        });
    };

    const handleDelete = (admin: Admin) => {
        if (admin.IsRootAdmin) return;

        setConfirmAction({
            isOpen: true,
            title: 'Delete Admin Account',
            message: `Are you sure you want to permanently delete ${admin.Email}? This action cannot be undone.`,
            type: 'danger',
            action: async () => {
                try {
                    await AdminManagementService.deleteAdmin(admin.UserID);
                    toast.success('Admin deleted successfully');
                    fetchData();
                } catch (error: any) {
                    toast.error(error.response?.data?.message || 'Failed to delete admin');
                    throw error;
                }
            }
        });
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-blue-600" />
                        Admin Management
                    </h1>
                    <p className="text-slate-600 mt-2">
                        Manage exam administrator accounts and permissions
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                    <UserPlus size={20} />
                    Create Admin
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Total Admins</p>
                            <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalAdmins}</p>
                        </div>
                        <Users className="w-12 h-12 text-blue-600 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Active</p>
                            <p className="text-3xl font-bold text-green-900 mt-2">{stats.activeAdmins}</p>
                        </div>
                        <Shield className="w-12 h-12 text-green-600 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 font-medium">Root Admins</p>
                            <p className="text-3xl font-bold text-purple-900 mt-2">{stats.rootAdmins}</p>
                        </div>
                        <Shield className="w-12 h-12 text-purple-600 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            id="search-admins"
                            name="searchAdmins"
                            autoComplete="off"
                            type="text"
                            placeholder="Search by email or name..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-label="Search admins"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-slate-400" />
                        <select
                            id="status-filter"
                            name="statusFilter"
                            autoComplete="off"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
                            className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            aria-label="Filter by status"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Admins Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Full Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Created</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            Loading admins...
                                        </div>
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No admins found
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.UserID} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                                            {admin.Email}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {admin.FullName || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {admin.IsRootAdmin ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                    <Shield size={12} />
                                                    Root Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                    Exam Admin
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {admin.IsActive ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                    Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(admin.CreatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 opacity-50 cursor-not-allowed"
                                                    title="View Activity (Coming Soon)"
                                                >
                                                    <Activity size={18} />
                                                </button>
                                                {!admin.IsRootAdmin && (
                                                    <>
                                                        <button
                                                            onClick={() => handleResetPassword(admin)}
                                                            className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-600"
                                                            title="Reset Password"
                                                        >
                                                            <Key size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(admin)}
                                                            className={`p-2 rounded-lg transition-colors ${admin.IsActive
                                                                ? 'hover:bg-slate-50 text-slate-600'
                                                                : 'hover:bg-green-50 text-green-600'}`}
                                                            title={admin.IsActive ? "Disable" : "Enable"}
                                                        >
                                                            {admin.IsActive ? <ShieldOff size={18} /> : <Shield size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(admin)}
                                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateAdminModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateAdmin}
            />

            <ConfirmationModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmAction.action}
                title={confirmAction.title}
                message={confirmAction.message}
                type={confirmAction.type}
            />
        </div>
    );
};

export default AdminManagement;
