import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button, Tooltip, Chip } from '@heroui/react';
import { normalizeExamDepartmentCode } from './departmentCode';

interface Exam {
    ExamID: number;
    ExamName: string;
    ExamDate: string; // YYYY-MM-DD
    Session: string;  // FN/AN
    Status: string;   // Scheduled, Completed, Conflict
    Subject?: {
        SubjectCode: string;
        SubjectName: string;
        Department?: {
            DepartmentCode: string;
            DepartmentName: string;
        }
    };
}

interface ExamCalendarProps {
    exams: Exam[];
    onExamClick?: (exam: Exam) => void;
}

const ExamCalendar: React.FC<ExamCalendarProps> = ({ exams, onExamClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleToday = () => setCurrentMonth(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Helper to get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return "bg-green-100 text-green-700 border-green-200";
            case 'Conflict': return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-blue-50 text-blue-700 border-blue-200";
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="text-gray-500" size={20} />
                    <h2 className="text-lg font-bold text-gray-800">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                </div>
                <div className="flex items-center gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={prevMonth}>
                        <ChevronLeft size={20} />
                    </Button>
                    <Button size="sm" variant="flat" onPress={handleToday} className="px-3 font-medium text-gray-600">
                        Today
                    </Button>
                    <Button isIconOnly size="sm" variant="light" onPress={nextMonth}>
                        <ChevronRight size={20} />
                    </Button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center py-2">
                {weekDays.map(day => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 bg-gray-200 gap-[1px]">
                {days.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const dayExams = exams.filter(e => isSameDay(new Date(e.ExamDate), day));

                    return (
                        <div
                            key={day.toString()}
                            className={`
                                min-h-[120px] bg-white p-2 relative
                                ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'text-gray-900'}
                                ${isToday(day) ? 'bg-blue-50/30 ring-inset ring-1 ring-blue-200' : ''}
                                hover:bg-gray-50 transition-colors cursor-pointer group
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`
                                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday(day) ? 'bg-blue-600 text-white' : ''}
                                `}>
                                    {format(day, dateFormat)}
                                </span>
                                {dayExams.length > 0 && (
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                        {dayExams.length}
                                    </span>
                                )}
                            </div>

                            {/* Events Stack */}
                            <div className="space-y-1 mt-1">
                                {dayExams.slice(0, 3).map((exam) => (
                                    <div
                                        key={exam.ExamID}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onExamClick && onExamClick(exam);
                                        }}
                                        className={`
                                            px-2 py-1 rounded text-xs border truncate cursor-pointer transition-transform hover:scale-[1.02] active:scale-95
                                            ${getStatusColor(exam.Status)}
                                        `}
                                        title={`${exam.ExamName} (${exam.Session}) - ${exam.Subject?.Department?.DepartmentName || 'General'}`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {exam.Subject?.Department?.DepartmentCode && (
                                                    <span className="text-[9px] font-bold opacity-80 bg-black/5 px-1 rounded flex-shrink-0">
                                                        {normalizeExamDepartmentCode(exam.Subject.Department.DepartmentCode)}
                                                    </span>
                                                )}
                                                <span className="font-semibold truncate">
                                                    {exam.Subject?.SubjectCode || 'Exam'}
                                                </span>
                                            </div>
                                            <span className="opacity-75 text-[10px] uppercase font-bold tracking-tighter shrink-0">
                                                {exam.Session}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {dayExams.length > 3 && (
                                    <div className="text-xs text-gray-500 pl-1 font-medium hover:text-blue-600">
                                        + {dayExams.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExamCalendar;
