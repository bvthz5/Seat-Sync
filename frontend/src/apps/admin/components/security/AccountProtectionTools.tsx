
import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Input, Button, Tabs, Tab, User, Chip } from "@heroui/react";
import { Shield, Search, Lock, Key as KeyIcon, LogOut, History, Unlock } from 'lucide-react';

export const AccountProtectionTools: React.FC = () => {
    const [searchEmail, setSearchEmail] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const handleSearch = () => {
        // Mock search
        if (searchEmail) {
            setSelectedUser({
                name: "John Doe",
                email: searchEmail,
                role: "Student",
                status: "Active",
                lastLogin: "2 hours ago"
            });
        }
    };

    return (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full">
            <CardHeader className="flex flex-col gap-4 p-4 bg-slate-50/50 border-b border-slate-100 items-start">
                <div className="flex justify-between items-center w-full">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        Account Protection
                    </h3>
                    <Chip size="sm" variant="flat" color="warning" className="text-[10px] font-bold h-6">ROOT ONLY</Chip>
                </div>
            </CardHeader>
            <CardBody className="p-4 flex flex-col gap-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter user email..."
                        size="sm"
                        startContent={<Search className="w-3 h-3 text-slate-400" />}
                        value={searchEmail}
                        onValueChange={setSearchEmail}
                        classNames={{
                            inputWrapper: "bg-white border border-slate-200 shadow-none"
                        }}
                    />
                    <Button isIconOnly size="sm" color="primary" variant="flat" onPress={handleSearch}>
                        <Search className="w-4 h-4" />
                    </Button>
                </div>

                {selectedUser ? (
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                        <User
                            name={selectedUser.name}
                            description={selectedUser.email}
                            avatarProps={{ size: "sm" }}
                            classNames={{ name: "font-bold text-slate-700", description: "text-slate-500" }}
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <Chip size="sm" variant="dot" color="success" className="border-0 px-0 text-[10px] uppercase font-bold text-slate-500">
                                {selectedUser.status}
                            </Chip>
                            <span className="text-[10px] text-slate-400">• Last Login: {selectedUser.lastLogin}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <Button size="sm" color="warning" variant="flat" startContent={<Lock className="w-3 h-3" />} className="font-semibold">
                                Lock Account
                            </Button>
                            <Button size="sm" color="danger" variant="flat" startContent={<LogOut className="w-3 h-3" />} className="font-semibold">
                                Force Logout
                            </Button>
                            <Button size="sm" color="primary" variant="flat" startContent={<KeyIcon className="w-3 h-3" />} className="font-semibold col-span-2">
                                Send Password Reset
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                        <Search className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs font-medium">Search for a user to manage security</span>
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100">
                    <Button fullWidth size="sm" variant="bordered" color="danger" startContent={<Shield className="w-3 h-3" />}>
                        Invalidate All System Tokens
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
};
