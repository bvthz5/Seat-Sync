import React, { useState } from 'react';
import { Tabs, Tab, Card, CardBody } from '@heroui/react';
import { Building2, Layers, DoorOpen, Armchair, AlertCircle } from 'lucide-react';
import { BlockManager } from '../components/structure/BlockManager';
import { FloorManager } from '../components/structure/FloorManager';
import { RoomManager } from '../components/structure/RoomManager';
import { LayoutConfig } from '../components/structure/LayoutConfig';
import { StructureImport } from '../components/structure/StructureImport';
import { useAuth } from '../../../hooks/useAuth';

const CollegeStructure: React.FC = () => {
    const { user } = useAuth();
    const [selectedTab, setSelectedTab] = useState<string>("blocks");

    const isRootAdmin = user?.IsRootAdmin === true;
    const isReadOnly = !isRootAdmin;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header Section */}
            <div className="pt-6 px-8 max-w-[1920px] mx-auto flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">College Structure</h1>
                <p className="text-slate-500 text-sm font-medium">Configure blocks, floors, rooms, and seating layouts.</p>

                {isReadOnly && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300 max-w-2xl">
                        <AlertCircle className="shrink-0" size={18} />
                        <div>
                            <p className="font-bold text-sm">Read-Only Access</p>
                            <p className="text-xs opacity-90">You are viewing this configuration in read-only mode. Only Root Admins can make changes.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Navigation Tabs */}
            <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60 mt-6 px-8">
                <div className="max-w-[1920px] mx-auto flex justify-between items-end gap-4">
                    <Tabs
                        aria-label="Structure Navigation"
                        color="primary"
                        variant="underlined"
                        classNames={{
                            tabList: "gap-6 relative rounded-none p-0",
                            cursor: "w-full bg-blue-600 h-[2px]",
                            tab: "max-w-fit px-0 h-12 data-[hover=true]:opacity-80",
                            tabContent: "group-data-[selected=true]:text-blue-600 group-data-[selected=true]:font-bold font-medium text-slate-500 text-sm transition-colors"
                        }}
                        selectedKey={selectedTab}
                        onSelectionChange={(key) => setSelectedTab(key.toString())}
                    >
                        <Tab
                            key="blocks"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Building2 size={16} strokeWidth={2.5} />
                                    <span>Blocks</span>
                                </div>
                            }
                        />
                        <Tab
                            key="floors"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Layers size={16} strokeWidth={2.5} />
                                    <span>Floors</span>
                                </div>
                            }
                        />
                        <Tab
                            key="rooms"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <DoorOpen size={16} strokeWidth={2.5} />
                                    <span>Rooms</span>
                                </div>
                            }
                        />
                        <Tab
                            key="layout"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Armchair size={16} strokeWidth={2.5} />
                                    <span>Seating Layout</span>
                                </div>
                            }
                        />
                    </Tabs>
                    {isRootAdmin && (
                        <div className="mb-2">
                            <StructureImport onChange={() => window.location.reload()} />
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="px-8 py-6 max-w-[1920px] mx-auto">
                {selectedTab === "blocks" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <BlockManager readOnly={isReadOnly} />
                    </div>
                )}
                {selectedTab === "floors" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <FloorManager readOnly={isReadOnly} />
                    </div>
                )}
                {selectedTab === "rooms" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <RoomManager readOnly={isReadOnly} />
                    </div>
                )}
                {selectedTab === "layout" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <LayoutConfig readOnly={isReadOnly} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollegeStructure;

