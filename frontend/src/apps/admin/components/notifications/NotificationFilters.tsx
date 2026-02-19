
import React from 'react';
import { Card, CardBody, Chip, Divider } from '@heroui/react';
import { Check, Layers, Tag } from 'lucide-react';

interface NotificationFiltersProps {
    filters: any;
    setFilters: (f: any) => void;
}

const CATEGORIES = [
    { id: 'SYSTEM', label: 'System' },
    { id: 'EXAM', label: 'Exam' },
    { id: 'ADMIN', label: 'Admin' },
    { id: 'STUDENT', label: 'Student' },
    { id: 'SECURITY', label: 'Security' },
];

const TYPES = [
    { id: 'INFO', label: 'Info', color: 'primary' },
    { id: 'WARNING', label: 'Warning', color: 'warning' },
    { id: 'ERROR', label: 'Error', color: 'danger' },
    { id: 'EMERGENCY', label: 'Emergency', color: 'danger' },
];

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({ filters, setFilters }) => {

    const toggleFilter = (type: 'category' | 'type', value: string) => {
        const current = filters[type];
        const newFilters = current.includes(value as never)
            ? current.filter((i: string) => i !== value)
            : [...current, value];
        setFilters({ ...filters, [type]: newFilters });
    };

    return (
        <Card className="border-none shadow-medium bg-white/80 backdrop-blur-xl h-fit sticky top-6">
            <CardBody className="p-6 space-y-8">
                {/* Categories */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Categories</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => {
                            const isSelected = filters.category.includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleFilter('category', cat.id)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border
                                        flex items-center gap-2
                                        ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 transform scale-105'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                        }
                                    `}
                                >
                                    {isSelected && <Check size={12} strokeWidth={4} />}
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Divider className="bg-slate-100" />

                {/* Types */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Alert Type</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {TYPES.map((type) => {
                            const isSelected = filters.type.includes(type.id);
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => toggleFilter('type', type.id)}
                                    className={`
                                        group w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                                        ${isSelected
                                            ? 'bg-slate-50 border-slate-300 shadow-sm'
                                            : 'bg-white border-transparent hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${type.color === 'danger' ? 'bg-red-500' :
                                                type.color === 'warning' ? 'bg-amber-500' :
                                                    'bg-blue-500'
                                            }`} />
                                        <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                                            {type.label}
                                        </span>
                                    </div>
                                    <div className={`
                                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${isSelected
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-slate-200 group-hover:border-slate-300'
                                        }
                                    `}>
                                        {isSelected && <Check size={10} strokeWidth={4} />}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Reset */}
                {(filters.category.length > 0 || filters.type.length > 0) && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                        <button
                            onClick={() => setFilters({ category: [], type: [] })}
                            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1"
                        >
                            <XCircleIcon /> Clear all filters
                        </button>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

const XCircleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
    </svg>
);
