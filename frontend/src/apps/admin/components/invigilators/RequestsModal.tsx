import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Spinner,
    Button,
    Chip,
} from '@heroui/react';
import { X, UserPlus, CheckCircle2, XCircle, Info, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invigilatorService, InvigilatorRequest } from '../../services/invigilatorService';

interface RequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const RequestsModal: React.FC<RequestsModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [requests, setRequests] = useState<InvigilatorRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await invigilatorService.getRequests();
            setRequests(data);
        } catch (error) {
            toast.error('Failed to load faculty requests.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen]);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        setProcessingId(id);
        try {
            if (action === 'approve') {
                await invigilatorService.approveRequest(id);
                toast.success('Request approved successfully. Activation email sent.');
            } else {
                await invigilatorService.rejectRequest(id);
                toast.success('Request rejected.');
            }
            onSuccess(); // refresh main page stats if any
            fetchRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${action} request`);
        } finally {
            setProcessingId(null);
        }
    };

    const displayData = requests.filter(req => statusFilter === 'ALL' || req.Status === statusFilter);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                            <UserPlus size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Faculty Access Requests</h2>
                            <p className="text-xs text-slate-500">Review pending onboarding requests from unlisted faculty.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex gap-2 overflow-x-auto shrink-0 items-center">
                    <Filter size={14} className="text-slate-400 mr-2" />
                    <Chip
                        variant="solid"
                        radius="md"
                        className={`cursor-pointer transition-colors ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                        onClick={() => setStatusFilter('ALL')}
                        classNames={{ content: 'font-semibold text-[11px]' }}
                    >
                        All
                    </Chip>
                    <Chip
                        variant="solid"
                        radius="md"
                        className={`cursor-pointer transition-colors ${statusFilter === 'PENDING' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                        onClick={() => setStatusFilter('PENDING')}
                        classNames={{ content: 'font-semibold text-[11px]' }}
                    >
                        Pending ({requests.filter(r => r.Status === 'PENDING').length})
                    </Chip>
                    <Chip
                        variant="solid"
                        radius="md"
                        className={`cursor-pointer transition-colors ${statusFilter === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                        onClick={() => setStatusFilter('APPROVED')}
                        classNames={{ content: 'font-semibold text-[11px]' }}
                    >
                        Approved
                    </Chip>
                    <Chip
                        variant="solid"
                        radius="md"
                        className={`cursor-pointer transition-colors ${statusFilter === 'REJECTED' ? 'bg-amber-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                        onClick={() => setStatusFilter('REJECTED')}
                        classNames={{ content: 'font-semibold text-[11px]' }}
                    >
                        Rejected
                    </Chip>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto bg-[#F7F8FA] p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-70">
                            <Spinner size="lg" color="primary" />
                            <p className="mt-4 text-sm font-semibold text-slate-500">Loading requests...</p>
                        </div>
                    ) : displayData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <Info size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} requests found.</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">There are currently no staff accounts pending your review in this specific category.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {displayData.map((req) => (
                                <div key={req.RequestID} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-blue-200 hover:shadow-md">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-base font-bold text-slate-900">{req.Name}</h3>
                                                {req.Status === 'PENDING' && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 uppercase">Pending Review</span>}
                                                {req.Status === 'APPROVED' && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100 uppercase">Approved</span>}
                                                {req.Status === 'REJECTED' && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-100 uppercase">Rejected</span>}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-x-4 gap-y-2 mt-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Faculty ID</p>
                                                    <p className="text-sm font-mono text-slate-700">{req.FacultyID}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                                    <p className="text-sm text-slate-700">{req.Email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Department</p>
                                                    <p className="text-sm text-slate-700">{req.Department} / {req.Designation || 'Faculty'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Phone</p>
                                                    <p className="text-sm text-slate-700">{req.Phone || '—'}</p>
                                                </div>
                                                <div className="sm:col-span-2 lg:col-span-3 lg:mt-1 border-t border-slate-50 pt-2 pb-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reason for joining</p>
                                                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">{req.Reason || 'No reason provided.'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {req.Status === 'PENDING' && (
                                            <div className="flex flex-row sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0 items-end">
                                                <Button
                                                    size="sm"
                                                    disabled={processingId === req.RequestID}
                                                    isLoading={processingId === req.RequestID}
                                                    onPress={() => handleAction(req.RequestID, 'approve')}
                                                    className="w-full sm:w-auto bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold justify-center"
                                                    startContent={processingId !== req.RequestID && <CheckCircle2 size={14} />}
                                                >
                                                    Approve &amp; Invite
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="bordered"
                                                    disabled={processingId === req.RequestID}
                                                    onPress={() => handleAction(req.RequestID, 'reject')}
                                                    className="w-full sm:w-auto border-slate-200 text-slate-600 font-bold justify-center hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                                    startContent={<XCircle size={14} />}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RequestsModal;
