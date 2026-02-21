
import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, Select, SelectItem, Divider, Avatar, cn } from "@heroui/react";
import { Send, Calendar, Users, AlertTriangle, CheckCircle2, MessageSquare, Smartphone, Mail, Globe, ShieldAlert, BadgeInfo, BellRing, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
// Services
import { createNotification, getRecipientCount } from '../../services/notificationService';

// Mock Data for Dropdowns
const EXAMS = [
    { id: 'ex-001', name: 'Software Engineering - Final' },
    { id: 'ex-002', name: 'Data Structures - Midterm' },
    { id: 'ex-003', name: 'Calculus I - Quiz' },
    { id: 'ex-004', name: 'Physics II - Lab Exec' },
];



export const CreateNotification: React.FC = () => {
    // --- State ---
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('general');
    const [audienceType, setAudienceType] = useState('all');
    const [selectedExam, setSelectedExam] = useState<string>('');

    const [customAudience, setCustomAudience] = useState<string[]>([]);
    const [channels, setChannels] = useState<string[]>(['in_app', 'email']);

    // --- Computed / Async State ---
    const [recipientCount, setRecipientCount] = useState(2450);
    const [isCounting, setIsCounting] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // --- Effects ---
    // Debounce recipient count fetch
    useEffect(() => {
        setIsCounting(true);
        const timer = setTimeout(() => {
            fetchRecipients();
        }, 800);
        return () => clearTimeout(timer);
    }, [audienceType, selectedExam, customAudience]);

    const fetchRecipients = async () => {
        try {
            const count = await getRecipientCount({
                type: audienceType,
                examId: selectedExam,
                departmentId: undefined,
                value: customAudience
            });
            setRecipientCount(count as number);
        } catch (error) {
            console.error("Failed to fetch count", error);
            setRecipientCount(0);
        } finally {
            setIsCounting(false);
        }
    };

    // --- Handlers ---
    const handleSend = async () => {
        // Validation
        if (!title.trim()) { toast.error("Title is required"); return; }
        if (!message.trim()) { toast.error("Message content is required"); return; }
        if (recipientCount === 0) { toast.error("Cannot send to 0 recipients"); return; }
        if (channels.length === 0) { toast.error("Select at least one delivery channel"); return; }

        setIsSending(true);
        try {
            // Map to new API payload
            let apiType = 'INFO';
            let apiPriority = 'NORMAL';
            let apiCategory = 'SYSTEM';

            switch (type) {
                case 'general': apiType = 'INFO'; break;
                case 'exam_update': apiType = 'INFO'; apiCategory = 'EXAM'; break;
                case 'attendance': apiType = 'WARNING'; apiCategory = 'EXAM'; break;
                case 'emergency': apiType = 'EMERGENCY'; apiPriority = 'CRITICAL'; apiCategory = 'SECURITY'; break;
            }

            let apiTargetType = 'ALL';
            let apiTargetId = null;

            switch (audienceType) {
                case 'all': apiTargetType = 'ALL'; break;
                case 'student': apiTargetType = 'ROLE'; apiTargetId = 'Student'; break; // Assuming role name
                case 'invigilator': apiTargetType = 'ROLE'; apiTargetId = 'Invigilator'; break;
                case 'admin': apiTargetType = 'ROLE'; apiTargetId = 'Admin'; break;
                case 'exam': apiTargetType = 'EXAM'; apiTargetId = selectedExam; break;
            }

            await createNotification({
                Title: title,
                Message: message,
                Type: apiType,
                Category: apiCategory,
                TargetType: apiTargetType,
                TargetId: apiTargetId,
                Priority: apiPriority,
                Channels: channels,
                Metadata: {
                    sentVia: 'admin_console',
                    originalAudience: audienceType
                }
            });

            toast.success("Notification sent successfully!");
            // Reset form
            setTitle('');
            setMessage('');
            setType('general');
            setAudienceType('all');
        } catch (error) {
            console.error(error);
            toast.error("Failed to send notification");
        } finally {
            setIsSending(false);
        }
    };

    const isEmergency = type === 'emergency';

    return (
        <div className="flex flex-col xl:flex-row gap-8 h-full animate-in fade-in duration-500 pb-10">
            {/* LEFT COLUMN: FORM */}
            <div className="flex-1 min-w-0 flex flex-col gap-8">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-10">

                    {/* Header */}
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Compose New Alert</h2>
                        <p className="text-slate-500 font-medium">Create and broadcast notifications to users instantly.</p>
                    </div>

                    {/* 1. Message Details */}
                    <div className="flex flex-col gap-6">
                        <SectionHeader number="01" title="Content" />

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <label htmlFor="title" className="block text-sm font-bold text-slate-700 ml-1">
                                    Subject Line <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Final Exam Schedule Update"
                                    variant="flat"
                                    radius="lg"
                                    size="lg"
                                    value={title}
                                    onValueChange={setTitle}
                                    isClearable
                                    classNames={{
                                        inputWrapper: "bg-slate-50 border-2 border-transparent hover:border-slate-200 focus-within:!border-indigo-500 focus-within:!bg-white shadow-none transition-all",
                                        input: "font-semibold text-slate-800 placeholder:text-slate-400"
                                    }}
                                    startContent={<MessageSquare className="text-slate-400 w-5 h-5" />}
                                />
                            </div>

                            <div className="space-y-3">
                                <label htmlFor="message" className="block text-sm font-bold text-slate-700 ml-1">
                                    Message Body <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    id="message"
                                    placeholder="Enter the main content of your notification..."
                                    variant="flat"
                                    radius="lg"
                                    size="lg"
                                    value={message}
                                    onValueChange={setMessage}
                                    minRows={5}
                                    classNames={{
                                        inputWrapper: "bg-slate-50 border-2 border-transparent hover:border-slate-200 focus-within:!border-indigo-500 focus-within:!bg-white shadow-none transition-all",
                                        input: "font-medium text-slate-700 leading-relaxed placeholder:text-slate-400"
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <Divider className="bg-slate-100" />

                    {/* 2. Type */}
                    <div className="flex flex-col gap-5">
                        <SectionHeader number="02" title="Classification" />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <TypeCard
                                id="general"
                                title="General"
                                icon={<BadgeInfo />}
                                selected={type}
                                onSelect={setType}
                                color="blue"
                            />
                            <TypeCard
                                id="exam_update"
                                title="Exam Update"
                                icon={<Calendar />}
                                selected={type}
                                onSelect={setType}
                                color="indigo"
                            />
                            <TypeCard
                                id="attendance"
                                title="Attendance"
                                icon={<UserCheck />}
                                selected={type}
                                onSelect={setType}
                                color="emerald"
                            />
                            <TypeCard
                                id="emergency"
                                title="Emergency"
                                icon={<ShieldAlert />}
                                selected={type}
                                onSelect={setType}
                                color="red"
                            />
                        </div>

                        {isEmergency && (
                            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-4 animate-in slide-in-from-top-2">
                                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-800 text-base">Emergency Protocol Active</h4>
                                    <p className="text-sm text-red-600 mt-1 font-medium leading-relaxed">
                                        This alert will override Do Not Disturb settings and trigger a loud sound on all devices. Use only for critical situations.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <Divider className="bg-slate-100" />

                    {/* 3. Target Audience */}
                    <div className="flex flex-col gap-5">
                        <div className="flex justify-between items-end">
                            <SectionHeader number="03" title="Audience" />

                            {/* Counter */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                                <Users className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                                    {isCounting ? 'Calc...' : `${recipientCount} Users`}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <SelectionCard id="all" label="All Users" icon={<Globe />} selected={audienceType} onSelect={setAudienceType} />
                            <SelectionCard id="student" label="Students" icon={<Users />} selected={audienceType} onSelect={setAudienceType} />
                            <SelectionCard id="invigilator" label="Invigilators" icon={<UserCheck />} selected={audienceType} onSelect={setAudienceType} />
                            <SelectionCard id="admin" label="Admins" icon={<ShieldAlert />} selected={audienceType} onSelect={setAudienceType} />
                            <SelectionCard id="exam" label="Specific Exam" icon={<Calendar />} selected={audienceType} onSelect={setAudienceType} />
                        </div>

                        {/* Conditional Inputs */}
                        <div className="min-h-[50px]">
                            {audienceType === 'exam' && (
                                <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                                    <label className="block text-sm font-bold text-slate-700 ml-1">Which Exam?</label>
                                    <Select
                                        placeholder="Select an exam series"
                                        variant="flat"
                                        selectedKeys={selectedExam ? [selectedExam] : []}
                                        onChange={(e) => setSelectedExam(e.target.value)}
                                        classNames={{
                                            trigger: "bg-slate-50 border-2 border-transparent hover:border-slate-200 focus:!border-indigo-500 focus:!bg-white h-12 shadow-none",
                                            value: "font-semibold text-slate-700",
                                            popoverContent: "bg-white shadow-xl border border-slate-100"
                                        }}
                                        renderValue={(items) => items.map(item => (
                                            <div key={item.key} className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-indigo-500" />
                                                <span>{(item.data as any)?.textValue}</span>
                                            </div>
                                        ))}
                                    >
                                        {EXAMS.map(exam => (
                                            <SelectItem key={exam.id} textValue={exam.name}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{exam.name}</span>
                                                    <span className="text-xs text-slate-400">ID: {exam.id}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>
                            )}


                        </div>
                    </div>

                    {/* 4. Delivery Channels */}
                    <div className="flex flex-col gap-5">
                        <SectionHeader number="04" title="Channels" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ChannelToggle
                                id="in_app"
                                label="In-App"
                                icon={<BellRing />}
                                isSelected={channels.includes('in_app')}
                                onChange={(id, checked) => setChannels(prev => checked ? [...prev, id] : prev.filter(c => c !== id))}
                            />
                            <ChannelToggle
                                id="email"
                                label="Email"
                                icon={<Mail />}
                                isSelected={channels.includes('email')}
                                onChange={(id, checked) => setChannels(prev => checked ? [...prev, id] : prev.filter(c => c !== id))}
                            />
                            <ChannelToggle
                                id="push"
                                label="Push Notif"
                                icon={<Smartphone />}
                                isSelected={channels.includes('push')}
                                onChange={(id, checked) => setChannels(prev => checked ? [...prev, id] : prev.filter(c => c !== id))}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-6 border-t border-slate-100">
                        <Button
                            size="lg"
                            color={isEmergency ? "danger" : "primary"}
                            className={cn(
                                "w-full font-black text-lg h-16 shadow-2xl transition-all active:scale-[0.98]",
                                isEmergency ? "shadow-red-300 bg-red-600 hover:bg-red-700" : "shadow-indigo-300 bg-indigo-600 hover:bg-indigo-700"
                            )}
                            startContent={isEmergency ? <ShieldAlert className="w-6 h-6" /> : <Send className="w-6 h-6" />}
                            isLoading={isSending}
                            isDisabled={recipientCount === 0 || !title}
                            onPress={handleSend}
                        >
                            {isEmergency ? "BROADCAST EMERGENCY ALERT" : "SEND NOTIFICATION"}
                        </Button>
                    </div>

                </div>
            </div>

            {/* RIGHT COLUMN: PREVIEW */}
            <div className="w-full xl:w-[420px] shrink-0 flex flex-col gap-6 sticky top-6 h-fit">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                        <Smartphone className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Live Preview</h3>
                        <p className="text-xs text-slate-400 font-medium">Real-time device simulation</p>
                    </div>
                </div>

                {/* Mobile Preview Device */}
                <div className="border-[14px] border-slate-800 rounded-[3.5rem] bg-slate-100 min-h-[700px] shadow-2xl relative overflow-hidden ring-1 ring-slate-900/50 transform transition-transform hover:scale-[1.01] duration-500">
                    {/* Status Bar */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800 flex justify-center items-end px-6 z-20 rounded-t-[2.5rem]">
                        <div className="w-28 h-5 bg-black rounded-b-2xl" />
                    </div>

                    {/* Content */}
                    <div className="mt-12 flex flex-col gap-6 p-6 h-full overflow-y-auto pb-20">

                        {/* Lock Screen Notification */}
                        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-white/60 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
                                        <Users className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-600 tracking-wide">SEAT SYNC</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">NOW</span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{title || "Notification Title"}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{message || "Message content will appear here..."}</p>
                        </div>

                        {/* App View Simulation */}
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 overflow-hidden flex flex-col relative h-[420px]">
                            {/* App Header */}
                            <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-10">
                                <Avatar className="w-8 h-8" size="sm" />
                                <span className="font-bold text-slate-800 text-sm">Notifications</span>
                                <div className="w-8" />
                            </div>

                            {/* App Content */}
                            <div className="p-4 bg-slate-50/50 flex-1 overflow-y-auto space-y-3">
                                <div className="text-xs font-bold text-slate-400 text-center py-2 uppercase tracking-wide">Today</div>

                                <div className={`p-4 rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden ${isEmergency ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
                                    }`}>
                                    {isEmergency && <div className="absolute top-0 right-0 p-2 opacity-5"><AlertTriangle size={80} /></div>}

                                    <div className="flex gap-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isEmergency ? "bg-red-500 text-white shadow-red-200" : "bg-indigo-500 text-white shadow-indigo-200"
                                            }`}>
                                            {isEmergency ? <AlertTriangle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-bold text-sm truncate pr-2 ${isEmergency ? "text-red-900" : "text-slate-800"}`}>
                                                    {title || "Title"}
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-300">1m</span>
                                            </div>
                                            <p className={`text-xs mt-1.5 leading-relaxed line-clamp-3 ${isEmergency ? "text-red-700 font-medium" : "text-slate-500"}`}>
                                                {message || "Body text..."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Mock Previous Items */}
                                <div className="opacity-40 grayscale pointer-events-none">
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-white mb-3">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                                                <Calendar className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div className="flex-1 py-1">
                                                <div className="h-2 w-24 bg-slate-200 rounded mb-2" />
                                                <div className="h-2 w-full bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

// --- Sub Components ---

const SectionHeader = ({ number, title }: { number: string, title: string }) => (
    <div className="flex items-center gap-3 mb-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-md shadow-slate-200">
            {number}
        </span>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{title}</h3>
    </div>
);

interface TypeCardProps {
    id: string;
    title: string;
    icon: React.ReactElement;
    selected: string;
    onSelect: (id: string) => void;
    color: string;
}

const TypeCard = ({ id, title, icon, selected, onSelect, color }: TypeCardProps) => {
    const isSelected = selected === id;

    // Color mapping for active state
    const activeClass = {
        blue: "bg-blue-600 border-blue-600 text-white shadow-blue-200",
        indigo: "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200",
        emerald: "bg-emerald-600 border-emerald-600 text-white shadow-emerald-200",
        red: "bg-red-600 border-red-600 text-white shadow-red-200"
    }[color] || "bg-slate-900 text-white";

    return (
        <button
            onClick={() => onSelect(id)}
            className={cn(
                "flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 shadow-sm active:scale-95 h-32",
                isSelected
                    ? `${activeClass} shadow-xl scale-[1.02]`
                    : "bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            )}
        >
            <div className={cn(
                "p-2.5 rounded-xl transition-colors",
                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            )}>
                {React.cloneElement(icon as any, { size: 24, strokeWidth: isSelected ? 3 : 2 })}
            </div>
            <span className="font-bold text-xs tracking-wide">{title}</span>
        </button>
    );
};

interface SelectionCardProps {
    id: string;
    label: string;
    icon: React.ReactElement;
    selected: string;
    onSelect: (id: string) => void;
}

const SelectionCard = ({ id, label, icon, selected, onSelect }: SelectionCardProps) => {
    const isSelected = selected === id;
    return (
        <button
            onClick={() => onSelect(id)}
            className={cn(
                "flex items-center gap-3 p-3 pl-4 rounded-xl border-2 transition-all duration-200 text-left group",
                isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
        >
            <div className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-500"
            )}>
                {icon}
            </div>
            <span className="font-bold text-sm truncate">{label}</span>
            {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto text-white animate-in zoom-in" />}
        </button>
    );
};

interface ChannelToggleProps {
    id: string;
    label: string;
    icon: React.ReactElement;
    isSelected: boolean;
    onChange: (id: string, checked: boolean) => void;
}

const ChannelToggle = ({ id, label, icon, isSelected, onChange }: ChannelToggleProps) => (
    <button
        onClick={() => onChange(id, !isSelected)}
        className={cn(
            "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 w-full text-left relative overflow-hidden group",
            isSelected
                ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                : "bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
        )}
    >
        <div className={cn(
            "p-2 rounded-xl transition-colors",
            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:text-slate-500"
        )}>
            {React.cloneElement(icon as any, { size: 20 })}
        </div>
        <div className="flex flex-col">
            <span className="font-bold text-sm">{label}</span>
            <span className={cn("text-[10px] font-medium", isSelected ? "text-slate-300" : "text-slate-400")}>
                {isSelected ? "Active" : "Disabled"}
            </span>
        </div>
        {isSelected && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            </div>
        )}
    </button>
);
