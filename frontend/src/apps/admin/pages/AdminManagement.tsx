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
    Filter
} from 'lucide-react';

interface Admin {
    UserID: number;
    Email: string;
    FullName: string | null;
    IsRootAdmin: boolean;
    IsActive: boolean;
    CreatedAt: string;
}

const AdminManagement: React.FC = () => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call
            // const response = await adminManagementService.getAllAdmins();
            // setAdmins(response.data);

            // Mock data for now
            setAdmins([
                {
                    UserID: 1,
                    Email: 'root@college.edu',
                    FullName: 'Root Administrator',
                    IsRootAdmin: true,
                    IsActive: true,
                    CreatedAt: new Date().toISOString()
                }
            ]);
        } catch (error) {
            console.error('Error fetching admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.Email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (admin.FullName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
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
                            <p className="text-3xl font-bold text-blue-900 mt-2">{admins.length}</p>
                        </div>
                        <Users className="w-12 h-12 text-blue-600 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Active</p>
                            <p className="text-3xl font-bold text-green-900 mt-2">
                                {admins.filter(a => a.IsActive).length}
                            </p>
                        </div>
                        <Shield className="w-12 h-12 text-green-600 opacity-50" />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 font-medium">Root Admins</p>
                            <p className="text-3xl font-bold text-purple-900 mt-2">
                                {admins.filter(a => a.IsRootAdmin).length}
                            </p>
                        </div>
                        <Shield className="w-12 h-12 text-purple-600 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by email or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                        <Filter size={20} />
                        Filter
                    </button>
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
                                        Loading admins...
                                    </td>
                                </tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No admins found
                                    </td>
                                </tr>
                            ) : (
                                filteredAdmins.map((admin) => (
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
                                                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                                                    title="View Activity"
                                                >
                                                    <Activity size={18} />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-amber-600"
                                                    title="Reset Password"
                                                >
                                                    <Key size={18} />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600"
                                                    title={admin.IsActive ? "Disable" : "Enable"}
                                                >
                                                    {admin.IsActive ? <ShieldOff size={18} /> : <Shield size={18} />}
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminManagement;
