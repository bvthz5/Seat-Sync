
import React, { useEffect, useState } from 'react';
import { Card, CardBody, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Pagination, Input, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Trash2, AlertTriangle, Search, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import academicService from '../services/academicService';
import { useDebounce } from '../../../hooks/useDebounce';

interface User {
    UserID: number;
    FullName: string;
    Email: string;
    IsActive: boolean;
    CreatedAt: string;
    isOrphaned: boolean;
}

const DataCleanup: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);

    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        // try {
        //     const res = await academicService.getStudentUsers({
        //         page,
        //         limit: 10,
        //         search: debouncedSearch
        //     });
        //     setUsers(res.data.users);
        //     setTotalPages(res.data.totalPages);
        //     setTotalUsers(res.data.total);
        // } catch (error) {
        //     console.error("Failed to load users", error);
        //     toast.error("Failed to load user accounts");
        // } finally {
        setIsLoading(false);
        // }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, debouncedSearch]);

    const handleDeleteUser = async (id: number) => {
        // try {
        //     await academicService.deleteUser(id);
        //     toast.success("User account deleted");
        //     fetchUsers();
        // } catch (error) {
        //     toast.error("Failed to delete user");
        // }
    };

    const handleDeleteAll = async () => {
        // try {
        //     const res = await academicService.deleteAllStudentUsers();
        //     toast.success(res.data.message);
        //     setIsDeleteAllOpen(false);
        //     fetchUsers();
        // } catch (error: any) {
        //     toast.error(error.response?.data?.message || "Failed to delete all users");
        // }
    };

    return (
        <div className="flex flex-col gap-8 max-w-[1600px] mx-auto min-h-screen pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-gray-200/50">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-red-600 flex items-center gap-3">
                        <ShieldAlert size={32} /> Data Cleanup
                    </h1>
                    <p className="text-gray-500 font-medium max-w-lg">
                        Manage orphaned user accounts. Deleting students from the directory does NOT delete their login accounts. Manage them here.
                    </p>
                </div>
                <Button
                    color="danger"
                    className="font-bold shadow-lg shadow-red-500/20"
                    startContent={<Trash2 size={20} />}
                    onPress={() => setIsDeleteAllOpen(true)}
                >
                    Delete All Accounts
                </Button>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                <Input
                    classNames={{
                        base: "w-full sm:w-96",
                        inputWrapper: "bg-transparent shadow-none hover:bg-gray-50 focus-within:!bg-gray-50 border-0 ring-0 data-[hover=true]:bg-gray-50",
                        input: "text-base",
                    }}
                    placeholder="Search users..."
                    startContent={<Search size={18} className="text-gray-400 mr-2" />}
                    value={searchQuery}
                    onValueChange={(val) => { setSearchQuery(val); setPage(1); }}
                    isClearable
                    onClear={() => setSearchQuery("")}
                />
            </div>

            {/* Table */}
            <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table
                    aria-label="User Cleanup Table"
                    shadow="none"
                    classNames={{
                        wrapper: "p-0",
                        th: "bg-gray-50/70 text-gray-500 font-medium text-xs uppercase tracking-wider h-12 border-b border-gray-100 pl-6",
                        td: "py-4 border-b border-gray-50 group-last:border-none pl-6",
                    }}
                    bottomContent={
                        totalPages > 1 && (
                            <div className="flex w-full justify-center px-4 py-4 border-t border-gray-100 bg-white">
                                <Pagination
                                    total={totalPages}
                                    page={page}
                                    onChange={setPage}
                                    color="danger"
                                    variant="light"
                                    showControls
                                />
                            </div>
                        )
                    }
                >
                    <TableHeader>
                        <TableColumn>USER DETAILS</TableColumn>
                        <TableColumn>STATUS</TableColumn>
                        <TableColumn>CREATED</TableColumn>
                        <TableColumn align="end">ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody items={users} isLoading={isLoading} emptyContent="No user accounts found.">
                        {(item) => (
                            <TableRow key={item.UserID}>
                                <TableCell>
                                    <div>
                                        <p className="font-bold text-gray-900">{item.FullName || "No Name"}</p>
                                        <p className="text-xs text-gray-500">{item.Email}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.isOrphaned ? (
                                        <Chip startContent={<AlertTriangle size={14} />} color="warning" variant="flat" size="sm">Orphaned (No Student Profile)</Chip>
                                    ) : (
                                        <Chip startContent={<CheckCircle size={14} />} color="success" variant="flat" size="sm">Linked</Chip>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-gray-500 text-sm">{new Date(item.CreatedAt).toLocaleDateString()}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end">
                                        <Tooltip content="Delete Account" color="danger">
                                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDeleteUser(item.UserID)}>
                                                <Trash2 size={18} />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Delete All Modal */}
            <Modal isOpen={isDeleteAllOpen} onClose={() => setIsDeleteAllOpen(false)}>
                <ModalContent>
                    <ModalHeader><span className="text-red-600 font-bold flex items-center gap-2"><AlertTriangle size={24} /> NUKE ALL ACCOUNTS?</span></ModalHeader>
                    <ModalBody>
                        <p className="text-gray-700">Are you sure you want to delete <b>ALL STUDENT LOGIN ACCOUNTS</b>?</p>
                        <p className="text-sm text-gray-500">This will prevent any student from logging in, even if their academic profile exists.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsDeleteAllOpen(false)}>Cancel</Button>
                        <Button color="danger" className="font-bold" onPress={handleDeleteAll}>Yes, Delete Everything</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default DataCleanup;
