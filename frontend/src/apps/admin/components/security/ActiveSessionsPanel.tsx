
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, Button, Chip, User, Pagination, Input, Tooltip } from "@heroui/react";
import { Search, Monitor, Smartphone, Globe, Clock, ShieldBan, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ActiveSession } from '../../services/securityService';

interface ActiveSessionsPanelProps {
    sessions: ActiveSession[];
    onTerminate: (sessionId: number) => void;
    onTerminateAll: (userId: number) => void;
    isLoading: boolean;
    onRefresh: () => void;
}

export const ActiveSessionsPanel: React.FC<ActiveSessionsPanelProps> = ({ sessions, onTerminate, onTerminateAll, isLoading, onRefresh }) => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const rowsPerPage = 5;

    const filteredSessions = useMemo(() => {
        return sessions.filter(s =>
            s.user?.Email.toLowerCase().includes(search.toLowerCase()) ||
            s.user?.FullName.toLowerCase().includes(search.toLowerCase()) ||
            s.IPAddress.includes(search)
        );
    }, [sessions, search]);

    const items = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredSessions.slice(start, end);
    }, [page, filteredSessions]);

    // Mock location based on IP (In real app, backend would resolve this)
    const getLocation = () => "Unknown Location";

    // Determine device icon
    const getDeviceIcon = (ua: string) => {
        if (/mobile/i.test(ua)) return <Smartphone className="w-4 h-4 text-slate-400" />;
        return <Monitor className="w-4 h-4 text-slate-400" />;
    };

    function platformSnippet(ua: string): string {
        if (ua.includes("Windows")) return "Windows PC";
        if (ua.includes("Macintosh")) return "Mac OS";
        if (ua.includes("Linux")) return "Linux Desktop";
        if (ua.includes("Android")) return "Android Device";
        if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS Device";
        return "Unknown Device";
    }

    return (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white h-full">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white border-b border-slate-100 gap-4">
                <div className="flex bg-transparent gap-3 items-center">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Monitor className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                            Active Sessions
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            Manage currently logged-in users
                        </p>
                    </div>
                    <Chip size="sm" variant="flat" color="success" className="ml-2 font-bold text-[10px] uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                        {sessions.length} Live
                    </Chip>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Input
                        classNames={{
                            base: "max-w-xs h-9",
                            mainWrapper: "h-full",
                            input: "text-small",
                            inputWrapper: "h-full font-normal text-slate-500 bg-slate-50 border-transparent hover:bg-slate-100 focus-within:bg-white focus-within:border-indigo-200 shadow-sm transition-all duration-200",
                        }}
                        placeholder="Search user or IP..."
                        size="sm"
                        startContent={<Search className="w-3.5 h-3.5 text-slate-400" />}
                        value={search}
                        onValueChange={setSearch}
                        radius="md"
                    />
                    <Button isIconOnly size="sm" variant="light" onPress={onRefresh} isLoading={isLoading} className="text-slate-400 hover:text-indigo-600">
                        <RefreshCcw className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardBody className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-bold tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-bold">User</th>
                                <th className="px-6 py-4 font-bold">Role</th>
                                <th className="px-6 py-4 font-bold">IP Address</th>
                                <th className="px-6 py-4 font-bold">Device</th>
                                <th className="px-6 py-4 font-bold">Login Time</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {items.length > 0 ? (
                                items.map((session) => (
                                    <tr key={session.SessionID} className="group hover:bg-slate-50/80 transition-colors duration-200">
                                        <td className="px-6 py-4">
                                            <User
                                                name={session.user?.FullName || 'Unknown User'}
                                                description={session.user?.Email}
                                                avatarProps={{
                                                    src: undefined,
                                                    name: (session.user?.FullName || 'U').charAt(0),
                                                    size: "sm",
                                                    className: "bg-indigo-100 text-indigo-600 font-bold ring-2 ring-white"
                                                }}
                                                classNames={{
                                                    name: "text-sm font-bold text-slate-700",
                                                    description: "text-[11px] text-slate-400 font-medium"
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                className={`capitalize font-bold border ${session.user?.Role === 'root_admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                        session.user?.Role === 'exam_admin' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}
                                            >
                                                {session.user?.Role?.replace('_', ' ')}
                                            </Chip>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100/50 px-2 py-1 rounded w-fit border border-slate-100">
                                                    {session.IPAddress}
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium pl-1">
                                                    <Globe className="w-3 h-3" /> {getLocation()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2" title={session.UserAgent}>
                                                <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                                                    {getDeviceIcon(session.UserAgent)}
                                                </div>
                                                <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">
                                                    {platformSnippet(session.UserAgent)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {new Date(session.LoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(session.LoginAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <Tooltip content="Terminate Session" color="danger" className="text-xs font-bold" offset={0}>
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        color="danger"
                                                        variant="flat"
                                                        className="bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                                                        onPress={() => onTerminate(session.SessionID)}
                                                    >
                                                        <ShieldBan className="w-4 h-4" />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                            <ShieldBan className="w-8 h-8 opacity-20" />
                                            <span className="text-sm font-medium">No active sessions found</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredSessions.length > rowsPerPage && (
                    <div className="flex justify-center p-4 border-t border-slate-100">
                        <Pagination
                            total={Math.ceil(filteredSessions.length / rowsPerPage)}
                            page={page}
                            onChange={setPage}
                            size="sm"
                            variant="light"
                            showControls
                            color="primary"
                            classNames={{
                                cursor: "bg-indigo-600 shadow-indigo-200"
                            }}
                        />
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
