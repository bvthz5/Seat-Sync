import React, { useEffect, useState } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Spinner,
    Tabs,
    Tab,
} from '@heroui/react';
import {
    RefreshCcw,
    CheckCircle2,
    XCircle,
    User,
    Calendar,
    MapPin,
    AlertCircle,
    ChevronRight,
    Users,
    Briefcase,
    ArrowLeft,
    Clock,
    UserCheck,
    FileText,
    ExternalLink,
    Filter,
    ArrowRightLeft,
    UserPlus,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { invigilatorService } from '../../services/invigilatorService';

interface SwapRequest {
    SwapID: number;
    ExamID: number;
    RoomID: number;
    RequesterID: number;
    Reason: string;
    Status: 'PENDING' | 'APPROVED' | 'REJECTED';
    CreatedAt: string;
    Exam?: {
        ExamName: string;
        ExamDate: string;
        Session: string;
    };
    Room?: {
        RoomCode: string;
    };
    Requester?: {
        Name: string;
        Department: string;
    };
}

interface AvailableInvigilator {
    FacultyID: number;
    Name: string;
    Department: string;
    Designation: string;
    dutyCount: number;
}

interface SwapRequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const SwapRequestsModal: React.FC<SwapRequestsModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [swaps, setSwaps] = useState<SwapRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null);
    const [availableInvigilators, setAvailableInvigilators] = useState<AvailableInvigilator[]>([]);
    const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("PENDING");

    const fetchSwaps = async () => {
        setIsLoading(true);
        try {
            const data = await invigilatorService.getSwaps();
            setSwaps(data);
        } catch (error) {
            toast.error("Failed to fetch swap requests");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchSwaps();
            setSelectedSwap(null);
        }
    }, [isOpen]);

    const handleSelectSwap = async (swap: SwapRequest) => {
        if (swap.Status !== 'PENDING') return; // Only pending can be acted upon
        setSelectedSwap(swap);
        setIsLoadingAvailable(true);
        try {
            const data = await invigilatorService.getAvailableInvigilatorsForSwap(swap.SwapID);
            setAvailableInvigilators(data);
        } catch (error) {
            toast.error("Failed to fetch available invigilators");
        } finally {
            setIsLoadingAvailable(false);
        }
    };

    const handleApprove = async (substituteId: number) => {
        if (!selectedSwap) return;
        setIsSubmitting(true);
        try {
            await invigilatorService.approveSwap(selectedSwap.SwapID, substituteId);
            toast.success("Duty swap approved successfully");
            fetchSwaps();
            setSelectedSwap(null);
            onSuccess();
        } catch (error) {
            toast.error("Failed to approve swap");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async (swapId: number) => {
        if (!window.confirm("Are you sure you want to reject this request?")) return;
        setIsSubmitting(true);
        try {
            await invigilatorService.rejectSwap(swapId);
            toast.success("Request rejected");
            fetchSwaps();
            onSuccess();
        } catch (error) {
            toast.error("Failed to reject swap");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const filteredSwaps = swaps.filter(s => {
        if (activeTab === "ALL") return true;
        return s.Status === activeTab;
    });

    const getStatusCounts = (status: string) => {
        return swaps.filter(s => s.Status === status).length;
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="4xl" 
            scrollBehavior="inside"
            classNames={{
                base: "bg-white shadow-2xl rounded-2xl overflow-hidden max-h-[85vh] border border-indigo-100",
                header: "p-0",
                body: "p-0",
                closeButton: "hover:bg-slate-100 p-1.5 rounded-full m-4 z-50 text-slate-400"
            }}
        >
            <ModalContent>
                <ModalBody className="p-0 flex flex-col h-full bg-[#fcfdfe]">
                    {/* Header Section */}
                    <div className="bg-white p-6 pb-4 shrink-0 border-b border-slate-50">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
                                <ArrowRightLeft size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Duty Swap Requests</h2>
                                <p className="text-slate-500 mt-1 text-[13px] font-medium leading-tight">Review and manage duty relief requests from faculty members.</p>
                            </div>
                        </div>

                        {/* Tabs Bar */}
                        <div className="flex items-center gap-1 p-0.5 bg-slate-50 rounded-lg w-fit border border-slate-100">
                            <button 
                                onClick={() => setActiveTab("ALL")}
                                className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-all ${activeTab === "ALL" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setActiveTab("PENDING")}
                                className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-all ${activeTab === "PENDING" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                            >
                                Pending ({getStatusCounts("PENDING")})
                            </button>
                            <button 
                                onClick={() => setActiveTab("APPROVED")}
                                className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-all ${activeTab === "APPROVED" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                            >
                                Approved
                            </button>
                            <button 
                                onClick={() => setActiveTab("REJECTED")}
                                className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-all ${activeTab === "REJECTED" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                            >
                                Rejected
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {selectedSwap ? (
                                <motion.div 
                                    key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="light" 
                                            size="sm"
                                            className="font-bold text-xs text-blue-600 h-8 px-3 rounded-lg hover:bg-blue-50"
                                            onClick={() => setSelectedSwap(null)}
                                            startContent={<ArrowLeft size={14} />}
                                        >
                                            Back to list
                                        </Button>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                                    {selectedSwap.Requester?.Name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800">{selectedSwap.Requester?.Name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedSwap.Requester?.Department}</span>
                                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[10px] font-bold text-slate-400">Requested {formatDate(selectedSwap.CreatedAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm"
                                                    className="bg-rose-500 text-white font-bold h-9 px-5 rounded-xl shadow-lg shadow-rose-500/10"
                                                    onClick={() => handleReject(selectedSwap.SwapID)}
                                                >
                                                    Reject Request
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <AlertCircle size={12} className="text-blue-500" /> Stated Reason
                                                </p>
                                                <p className="text-slate-600 text-sm font-medium italic leading-relaxed">"{selectedSwap.Reason}"</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-blue-500" /> Target Duty
                                                </p>
                                                <h4 className="text-slate-800 text-sm font-bold mb-1">{selectedSwap.Exam?.ExamName}</h4>
                                                <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-tighter">
                                                    <span>{formatDate(selectedSwap.Exam?.ExamDate)}</span>
                                                    <div className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                    <span>{selectedSwap.Exam?.Session}</span>
                                                    <div className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                                    <span>{selectedSwap.Room?.RoomCode}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-base font-bold text-slate-800">Select Replacement Officer</h4>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest border border-emerald-100/50">
                                                <UserCheck size={10} /> {availableInvigilators.length} Available
                                            </div>
                                        </div>

                                        {isLoadingAvailable ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                <Spinner size="sm" color="primary" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying staff schedules...</p>
                                            </div>
                                        ) : availableInvigilators.length === 0 ? (
                                            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                                <Info size={32} className="mx-auto text-slate-200 mb-3" />
                                                <h5 className="text-slate-400 font-bold text-sm">No Direct Matches</h5>
                                                <p className="text-slate-400 text-xs mt-1">All eligible faculty are assigned to duties in this slot.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                                                {availableInvigilators.map((inv) => (
                                                    <div key={inv.FacultyID} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-blue-200 transition-all group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-base group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                                {inv.Name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm">{inv.Name}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{inv.Department} • {inv.dutyCount} Duties</p>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-slate-900 text-white font-bold h-8 px-4 rounded-lg hover:bg-blue-600 transition-colors text-xs"
                                                            isLoading={isSubmitting}
                                                            onClick={() => handleApprove(inv.FacultyID)}
                                                        >
                                                            Assign
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="space-y-3 pb-6"
                                >
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                                            <Spinner color="primary" size="sm" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning requests...</p>
                                        </div>
                                    ) : filteredSwaps.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                <Info size={24} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800">No {activeTab.toLowerCase()} requests found.</h3>
                                            <p className="text-slate-400 mt-1 text-[13px]">There are currently no staff accounts pending your review in<br/>this specific category.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2.5">
                                            {filteredSwaps.map((swap) => (
                                                <div 
                                                    key={swap.SwapID}
                                                    onClick={() => handleSelectSwap(swap)}
                                                    className={`bg-white p-4 rounded-2xl border transition-all flex items-center justify-between ${
                                                        swap.Status === 'PENDING' ? 'border-slate-100 hover:border-blue-600 hover:shadow-md cursor-pointer' : 'border-slate-50 opacity-80'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 font-black text-lg">
                                                            {swap.Requester?.Name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-800 text-[15px] leading-tight">{swap.Requester?.Name}</h4>
                                                                {swap.Status !== 'PENDING' && (
                                                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                                        swap.Status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                                    }`}>
                                                                        {swap.Status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                {swap.Requester?.Department} • {formatDate(swap.Exam?.ExamDate)} • {swap.Room?.RoomCode || 'Main Hall'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {swap.Status === 'PENDING' && (
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-slate-900 text-white font-bold h-9 px-6 rounded-xl group-hover:bg-blue-600 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleSelectSwap(swap); }}
                                                        >
                                                            Select <ChevronRight size={14} className="ml-0.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ModalBody>
            </ModalContent>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </Modal>
    );
};

export default SwapRequestsModal;
