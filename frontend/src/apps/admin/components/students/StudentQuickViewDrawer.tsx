import React from 'react';
import {
    Button,
    Progress
} from '@heroui/react';
import {
    X,
    BookOpen,
    Phone as PhoneIcon,
    Mail,
    AlertTriangle,
    ShieldCheck,
    Pencil,
    Trash2,
} from 'lucide-react';

interface Student {
    StudentID: number;
    RegisterNumber: string;
    BatchYear: number;
    User?: {
        Email: string;
        FullName?: string;
        isActive?: boolean;
        Phone?: string;
    };
    Department?: {
        DepartmentCode: string;
        DepartmentName?: string;
    };
    Program?: {
        ProgramName: string;
        DurationYears?: number;
        TotalSemesters?: number;
    };
    Semester?: {
        SemesterNumber: number;
    };
    CalculatedSemester?: number;
    MaxSemesters?: number;
    Status?: 'Active' | 'Incomplete' | 'Pending' | 'Disabled';
}

interface StudentQuickViewDrawerProps {
    student: Student | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (student: Student) => void;
    onDelete?: (student: Student) => void;
}

const getStatusDot = (status?: string) => {
    switch (status) {
        case 'Active':
            return 'bg-emerald-500';
        case 'Incomplete':
            return 'bg-amber-500';
        case 'Pending':
            return 'bg-blue-500';
        case 'Disabled':
            return 'bg-red-500';
        default:
            return 'bg-slate-300';
    }
};

const getStatusColor = (status?: string) => {
    switch (status) {
        case 'Active':
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'Incomplete':
            return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'Pending':
            return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'Disabled':
            return 'bg-red-50 text-red-700 border-red-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const StudentQuickViewDrawer: React.FC<StudentQuickViewDrawerProps> = ({
    student,
    isOpen,
    onClose,
    onEdit,
    onDelete,
}) => {
    if (!student) return null;

    const passoutYear = student.BatchYear && student.Program?.DurationYears
        ? student.BatchYear + student.Program.DurationYears
        : null;

    const progressPercentage = student.CalculatedSemester && student.MaxSemesters
        ? (student.CalculatedSemester / student.MaxSemesters) * 100
        : 0;

    return (
        <>
            <div
                className={`fixed inset-0 transition-opacity duration-300 z-40 ${
                    isOpen
                        ? 'bg-black/30 backdrop-blur-sm opacity-100'
                        : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            <div
                className={`fixed inset-y-0 right-0 w-full sm:w-[540px] bg-white shadow-2xl transition-transform duration-300 z-50 flex flex-col ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
            >
                {/* HEADER - FIXED AT TOP, NO OVERLAP */}
                <div className="flex-shrink-0 border-b-2 border-gray-300 bg-gradient-to-b from-blue-50 to-white px-6 py-6 relative z-20 mt-14">
                    {/* Avatar and Info Container */}
                    <div className="flex items-center gap-3 mb-4">
                        {/* Avatar - Large and Prominent */}
                        <div className="flex-shrink-0 relative">
                            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg border-3 border-white">
                                {(student.User?.FullName || 'U')[0].toUpperCase()}
                            </div>
                            <div
                                className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-md ${getStatusDot(
                                    student.Status
                                )}`}
                            />
                        </div>

                        {/* Name and Details */}
                        <div className="flex-1">
                            <h1 className="text-base font-extrabold text-gray-900 leading-tight">
                                {student.User?.FullName || 'Unknown'}
                            </h1>
                            <p className="text-xs text-gray-600 mt-0.5">Student Profile</p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900 transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex px-2 py-1 font-mono text-xs font-extrabold text-blue-800 bg-blue-100 border border-blue-300 rounded">
                            {student.RegisterNumber}
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-extrabold uppercase border rounded ${getStatusColor(
                                student.Status
                            )}`}
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {student.Status}
                        </span>
                    </div>
                </div>

                {/* CONTENT SECTION - CLEAR VISUAL SEPARATION */}
                <div className="flex-1 overflow-y-auto relative z-10 bg-white border-t-4 border-gray-100">
                    <div className="space-y-6 px-5 pt-10 pb-6">
                        {/* Quick Stats - Large and Prominent */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-blue-300 bg-blue-50 p-4">
                                <p className="text-xs font-bold uppercase text-blue-700">Batch</p>
                                <p className="mt-2 text-2xl font-black text-blue-900">
                                    {student.BatchYear}
                                </p>
                            </div>

                            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                                <p className="text-xs font-bold uppercase text-emerald-700">Access</p>
                                <div className="mt-2 inline-flex items-center gap-1 rounded text-sm font-bold">
                                    {student.User?.isActive ? (
                                        <>
                                            <ShieldCheck size={14} className="text-emerald-600" />
                                            <span className="text-emerald-700">Unlocked</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle size={14} className="text-amber-600" />
                                            <span className="text-amber-700">Locked</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-gray-500">
                                <BookOpen size={12} />
                                Academic Profile
                            </h2>
                            <div className="space-y-3 rounded border border-gray-200 bg-white p-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">Program</p>
                                    <p className="mt-0.5 text-xs font-bold text-gray-900">
                                        {student.Program?.ProgramName || 'Not Assigned'}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase text-gray-500">Department</p>
                                    <p className="mt-0.5 text-xs font-bold text-gray-900">
                                        {student.Department?.DepartmentName ||
                                            student.Department?.DepartmentCode ||
                                            'Not Assigned'}
                                    </p>
                                </div>

                                {student.Program?.DurationYears && (
                                    <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase text-gray-500">Duration</p>
                                            <p className="mt-0.5 text-xs font-bold text-gray-900">
                                                {student.Program.DurationYears}y
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase text-gray-500">Passout</p>
                                            <p className="mt-0.5 text-xs font-bold text-green-700">
                                                {passoutYear}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-gray-100 pt-3">
                                    <div className="mb-1 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase text-gray-500">Semester</p>
                                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                                              Sem {student.CalculatedSemester || student.Semester?.SemesterNumber || '-'}
                                        </span>
                                    </div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase text-gray-500">Progress</p>
                                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                                            {student.CalculatedSemester || 0}/{student.MaxSemesters || '-'}
                                        </span>
                                    </div>
                                    <Progress
                                        value={progressPercentage}
                                        className="h-1.5"
                                        aria-label="Academic progress"
                                        classNames={{
                                            indicator: 'bg-blue-600',
                                            track: 'bg-gray-200',
                                        }}
                                    />
                                    <p className="mt-0.5 text-center text-xs font-semibold text-gray-500">
                                        {Math.round(progressPercentage)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-gray-500">
                                <PhoneIcon size={12} />
                                Contact
                            </h2>
                            <div className="divide-y divide-gray-100 rounded border border-gray-200 bg-white overflow-hidden">
                                <div className="flex items-center gap-2 p-3">
                                    <div className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded bg-blue-50 text-blue-600">
                                        <Mail size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase text-gray-500">Email</p>
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                            {student.User?.Email || 'Not provided'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3">
                                    <div className="flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded bg-emerald-50 text-emerald-600">
                                        <PhoneIcon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold uppercase text-gray-500">Phone</p>
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                            {student.User?.Phone || 'Not provided'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onPress={() => {
                                onEdit?.(student);
                                onClose();
                            }}
                            className="h-9 bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 text-sm"
                            startContent={<Pencil size={14} />}
                        >
                            Edit
                        </Button>
                        <Button
                            onPress={() => {
                                onDelete?.(student);
                                onClose();
                            }}
                            className="h-9 bg-red-50 text-red-600 font-semibold hover:bg-red-100 border border-red-200 text-sm"
                            startContent={<Trash2 size={14} />}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StudentQuickViewDrawer;
