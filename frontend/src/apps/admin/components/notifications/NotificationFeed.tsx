
import React from 'react';
import { Card, CardBody, Avatar, Chip, Button } from '@heroui/react';
import { Notification } from '../../services/notificationService';
import { Check, Trash2, AlertCircle, Info, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationFeedProps {
    notifications: Notification[];
    onMarkRead: (id: number) => void;
    onDelete: (id: number) => void;
}

const getIcon = (type: string) => {
    switch (type) {
        case 'INFO': return <Info size={18} className="text-blue-500" />;
        case 'WARNING': return <AlertCircle size={18} className="text-amber-500" />;
        case 'ERROR': return <XCircle size={18} className="text-rose-500" />;
        case 'SUCCESS': return <CheckCircle2 size={18} className="text-emerald-500" />;
        case 'EMERGENCY': return <ShieldAlert size={18} className="text-red-600 animate-pulse" />;
        default: return <Info size={18} className="text-slate-500" />;
    }
};

const getBadgeColor = (priority: string) => {
    switch (priority) {
        case 'LOW': return "default";
        case 'NORMAL': return "primary";
        case 'HIGH': return "warning";
        case 'CRITICAL': return "danger";
        default: return "default";
    }
};

export const NotificationFeed: React.FC<NotificationFeedProps> = ({ notifications, onMarkRead, onDelete }) => {
    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <p>No notifications found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {notifications.map((n) => (
                <Card
                    key={n.id}
                    className={`border-l-4 ${!n.isRead ? 'border-primary-500 bg-primary-50/10' : 'border-transparent bg-white'} shadow-sm hover:shadow-md transition-all`}
                >
                    <CardBody className="p-4 flex flex-row gap-4 items-start">
                        <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            {getIcon(n.type)}
                        </div>

                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                                <h4 className={`text-sm font-bold ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {n.title}
                                </h4>
                                <Chip size="sm" variant="flat" color={getBadgeColor(n.priority) as any} className="capitalize text-[10px] h-5">
                                    {n.priority.toLowerCase()}
                                </Chip>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                    {n.category}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.isRead && (
                                <Button isIconOnly size="sm" variant="light" onClick={() => onMarkRead(n.id)} title="Mark as Read">
                                    <Check size={16} className="text-emerald-600" />
                                </Button>
                            )}
                            <Button isIconOnly size="sm" variant="light" color="danger" onClick={() => onDelete(n.id)} title="Delete">
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};
