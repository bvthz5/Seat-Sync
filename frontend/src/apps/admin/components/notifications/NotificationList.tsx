
import React, { useState, useEffect } from 'react';
import { Button, Input, Select, SelectItem, Chip, Avatar, Tooltip, Pagination, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, getKeyValue } from "@heroui/react";
import { Search, Filter, MoreVertical, Eye, Trash2, Send } from 'lucide-react';
import { getNotifications, Notification, deleteNotification } from '../../services';
import toast from 'react-hot-toast';

const columns = [
    { name: "TITLE", uid: "title" },
    { name: "TYPE", uid: "type" },
    { name: "AUDIENCE", uid: "audience" },
    { name: "STATUS", uid: "status" },
    { name: "SENT AT", uid: "sentAt" },
    { name: "ACTIONS", uid: "actions" },
];

export const NotificationList: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filterValue, setFilterValue] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getNotifications();
        setNotifications(data);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this notification?")) {
            await deleteNotification(id);
            toast.success("Notification deleted");
            loadData();
        }
    };

    const renderCell = React.useCallback((item: Notification, columnKey: React.Key) => {
        // @ts-ignore
        const cellValue = item[columnKey];

        switch (columnKey) {
            case "title":
                return (
                    <div className="flex flex-col">
                        <p className="text-bold text-sm capitalize">{item.title}</p>
                        <p className="text-bold text-tiny text-default-400 truncate max-w-[200px]">{item.message}</p>
                    </div>
                );
            case "type":
                return (
                    <Chip className="capitalize" size="sm" variant="flat" color={item.type === 'emergency' ? 'danger' : item.type === 'exam_update' ? 'warning' : 'default'}>
                        {item.type.replace('_', ' ')}
                    </Chip>
                );
            case "audience":
                return (
                    <div className="flex flex-col">
                        <p className="text-bold text-sm capitalize text-default-600">{(item.audience || []).join(', ')}</p>
                    </div>
                );
            case "status":
                return (
                    <Chip className="capitalize" size="sm" variant="dot" color={item.status === 'delivered' ? 'success' : 'warning'}>
                        {item.status}
                    </Chip>
                );
            case "sentAt":
                return (
                    <div className="flex flex-col">
                        <p className="text-bold text-small whitespace-nowrap">{new Date(item.sentAt || '').toLocaleDateString()}</p>
                        <p className="text-tiny text-default-400 whitespace-nowrap">{new Date(item.sentAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                );
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-2">
                        <Tooltip content="Details">
                            <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                                <Eye className="w-4 h-4" />
                            </span>
                        </Tooltip>
                        <Tooltip color="danger" content="Delete">
                            <span className="text-lg text-danger cursor-pointer active:opacity-50" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                            </span>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue;
        }
    }, []);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-3 items-end">
                <Input
                    isClearable
                    className="w-full sm:max-w-[44%]"
                    placeholder="Search by name..."
                    startContent={<Search className="w-4 h-4 text-default-400" />}
                    value={filterValue}
                    onClear={() => setFilterValue("")}
                    onValueChange={setFilterValue}
                    variant="bordered"
                />
                <div className="flex gap-3">
                    <Select
                        placeholder="Status"
                        variant="bordered"
                        defaultSelectedKeys={["all"]}
                        className="w-[150px]"
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <SelectItem key="all">All Status</SelectItem>
                        <SelectItem key="delivered">Delivered</SelectItem>
                        <SelectItem key="draft">Drafts</SelectItem>
                    </Select>
                    <Button color="primary" variant="flat" startContent={<Filter className="w-4 h-4" />}>
                        Filters
                    </Button>
                </div>
            </div>

            <Table aria-label="Notifications Table" removeWrapper>
                <TableHeader columns={columns}>
                    {(column) => (
                        <TableColumn key={column.uid} align={column.uid === "actions" ? "end" : "start"}>
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody items={notifications} emptyContent={"No rows to display."}>
                    {(item) => (
                        <TableRow key={item.id}>
                            {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
