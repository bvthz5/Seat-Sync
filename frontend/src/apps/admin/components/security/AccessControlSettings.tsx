
import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Checkbox, Button } from "@heroui/react";
import { Settings, Lock, Key, Clock, Shield, Globe } from 'lucide-react';

export const AccessControlSettings: React.FC = () => {
    return (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full bg-white">
            <CardHeader className="flex justify-between items-center p-6 bg-white border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500" />
                    Access Control
                </h3>
                <Button size="sm" variant="light" color="primary" className="font-bold text-xs text-indigo-600 hover:bg-indigo-50">
                    Save Changes
                </Button>
            </CardHeader>
            <CardBody className="p-0 bg-slate-50/20">
                <div className="flex flex-col">
                    <SettingItem
                        icon={Key}
                        title="Enforce Strong Passwords"
                        desc="Require uppercase, numbers, and symbols."
                        defaultSelected={true}
                    />
                    <SettingItem
                        icon={Shield}
                        title="Root Admin 2FA"
                        desc="Mandatory two-factor authentication for root access."
                        defaultSelected={true}
                    />
                    <SettingItem
                        icon={Clock}
                        title="Session Timeout"
                        desc="Auto-logout inactive users after 30 minutes."
                        defaultSelected={false}
                    />
                    <SettingItem
                        icon={Lock}
                        title="Account Lockout"
                        desc="Lock account after 5 failed login attempts."
                        defaultSelected={true}
                    />
                    <SettingItem
                        icon={Globe}
                        title="Geo-IP Restriction"
                        desc="Block login attempts from unknown countries."
                        defaultSelected={false}
                        isLast
                    />
                </div>
            </CardBody>
        </Card>
    );
};

interface SettingItemProps {
    icon: any;
    title: string;
    desc: string;
    defaultSelected: boolean;
    isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon: Icon, title, desc, defaultSelected, isLast }) => {
    const [isSelected, setIsSelected] = useState(defaultSelected);

    return (
        <div
            className={`flex items-center justify-between p-5 transition-all duration-200 cursor-pointer group hover:bg-white ${!isLast ? 'border-b border-slate-100/60' : ''} ${isSelected ? 'bg-white' : ''}`}
            onClick={() => setIsSelected(!isSelected)}
        >
            <div className="flex items-start gap-4">
                <div className={`mt-0.5 w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm transition-all duration-300 ${isSelected
                    ? "bg-indigo-50 border-indigo-100 text-indigo-600 ring-2 ring-indigo-50/50"
                    : "bg-white border-slate-100 text-slate-400 group-hover:border-slate-200 group-hover:text-slate-500"
                    }`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <h4 className={`text-sm font-bold mb-0.5 transition-colors duration-200 ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                        {title}
                    </h4>
                    <p className="text-xs font-medium text-slate-400 max-w-[220px] leading-relaxed">
                        {desc}
                    </p>
                </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
                <Checkbox id="chk-13odjqi" name="chk-13odjqi" isSelected={isSelected}
                    onValueChange={setIsSelected}
                    size="sm"
                    color="primary"
                    radius="sm"
                    classNames={{
                        wrapper: "group-hover:scale-110 transition-transform duration-200"
                    }}
                />
            </div>
        </div>
    );
};
