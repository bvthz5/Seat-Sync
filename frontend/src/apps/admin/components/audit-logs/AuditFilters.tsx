import React from 'react';
import { Input, Button, Select, SelectItem, DateRangePicker } from "@heroui/react";
import { Search, Filter, RefreshCcw, XCircle, UserCog } from 'lucide-react';
import { LogFilters } from '../../types/audit';

interface AuditFiltersProps {
    filters: LogFilters;
    onFilterChange: (newFilters: LogFilters) => void;
    onClear: () => void;
}

export const AuditFilters: React.FC<AuditFiltersProps> = ({ filters, onFilterChange, onClear }) => {

    const handleChange = (key: keyof LogFilters, value: any) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Advanced Filters</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                    <span id="label-search" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Log Search</span>
                    <Input
                        id="search-input"
                        name="search"
                        aria-labelledby="label-search"
                        placeholder="Search by ID, User, or Content..."
                        startContent={<Search className="w-4 h-4 text-slate-400" />}
                        value={filters.search || ''}
                        onValueChange={(val) => handleChange('search', val)}
                        radius="lg"
                        variant="bordered"
                        classNames={{
                            input: "text-slate-700 placeholder:text-slate-400 font-medium",
                            inputWrapper: "bg-slate-50 border-slate-200 hover:border-slate-300 shadow-none h-10"
                        }}
                    />
                </div>

                {/* Role Filter */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                    <span id="label-role" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Actor Role</span>
                    <Select
                        id="role-select"
                        name="role"
                        aria-labelledby="label-role"
                        placeholder="Any Role"
                        selectedKeys={filters.role ? [filters.role] : []}
                        onSelectionChange={(keys) => handleChange('role', Array.from(keys)[0])}
                        radius="lg"
                        variant="bordered"
                        startContent={<UserCog className="w-4 h-4 text-slate-400" />}
                        disableSelectorIconRotation
                        classNames={{
                            trigger: "bg-slate-50 border-slate-200 hover:border-slate-300 shadow-none h-10 data-[open=true]:border-slate-400",
                            value: "text-slate-700 font-medium",
                            selectorIcon: "right-3"
                        }}
                        popoverProps={{
                            classNames: {
                                content: "bg-white border border-slate-200 shadow-lg"
                            }
                        }}
                    >
                        <SelectItem key="root_admin" startContent={<div className="w-2 h-2 rounded-full bg-purple-500" />}>Root Admin</SelectItem>
                        <SelectItem key="exam_admin" startContent={<div className="w-2 h-2 rounded-full bg-blue-500" />}>Exam Admin</SelectItem>
                        <SelectItem key="invigilator" startContent={<div className="w-2 h-2 rounded-full bg-orange-500" />}>Invigilator</SelectItem>
                        <SelectItem key="student" startContent={<div className="w-2 h-2 rounded-full bg-green-500" />}>Student</SelectItem>
                        <SelectItem key="system" startContent={<div className="w-2 h-2 rounded-full bg-slate-500" />}>System</SelectItem>
                    </Select>
                </div>

                {/* Action Type */}
                <div className="md:col-span-3 flex flex-col gap-1.5">
                    <span id="label-action" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Action Type</span>
                    <Input
                        id="action-input"
                        name="action"
                        aria-labelledby="label-action"
                        placeholder="e.g. EXAM_PUBLISHED"
                        value={filters.action || ''}
                        onValueChange={(val) => handleChange('action', val)}
                        radius="lg"
                        variant="bordered"
                        classNames={{
                            input: "text-slate-700 placeholder:text-slate-400 font-medium",
                            inputWrapper: "bg-slate-50 border-slate-200 hover:border-slate-300 shadow-none h-10"
                        }}
                    />
                </div>

                {/* Severity */}
                <div className="md:col-span-2 flex flex-col gap-1.5">
                    <span id="label-severity" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Severity</span>
                    <Select
                        id="severity-select"
                        name="severity"
                        aria-labelledby="label-severity"
                        placeholder="All Levels"
                        selectedKeys={filters.severity ? [filters.severity] : []}
                        onSelectionChange={(keys) => handleChange('severity', Array.from(keys)[0])}
                        radius="lg"
                        variant="bordered"
                        disableSelectorIconRotation
                        classNames={{
                            trigger: "bg-slate-50 border-slate-200 hover:border-slate-300 shadow-none h-10 data-[open=true]:border-slate-400",
                            value: "text-slate-700 font-medium",
                            selectorIcon: "right-3"
                        }}
                        popoverProps={{
                            classNames: {
                                content: "bg-white border border-slate-200 shadow-lg"
                            }
                        }}
                    >
                        <SelectItem key="Info" startContent={<div className="w-2 h-2 rounded-full bg-blue-500" />}>Info</SelectItem>
                        <SelectItem key="Warning" startContent={<div className="w-2 h-2 rounded-full bg-yellow-500" />}>Warning</SelectItem>
                        <SelectItem key="Critical" startContent={<div className="w-2 h-2 rounded-full bg-red-500" />}>Critical</SelectItem>
                    </Select>
                </div>

                {/* Clear Button */}
                <div className="md:col-span-1 flex flex-col justify-end">
                    <Button
                        isIconOnly
                        variant="flat"
                        color="danger"
                        onPress={onClear}
                        title="Clear Filters"
                        className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 w-full h-10 rounded-lg border border-red-100"
                    >
                        <XCircle className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
