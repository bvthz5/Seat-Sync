import React, { useState } from 'react';
import { Tabs, Tab, Button, Tooltip, useDisclosure } from '@heroui/react';
import { Building2, Layers, DoorOpen, Armchair, AlertCircle, ChevronLeft, Trash2, ShieldAlert, Zap } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { InternalBlockManager } from '../components/internal-structure/InternalBlockManager';
import { InternalFloorManager } from '../components/internal-structure/InternalFloorManager';
import { InternalRoomManager } from '../components/internal-structure/InternalRoomManager';
import { InternalLayoutConfig } from '../components/internal-structure/InternalLayoutConfig';
import { InternalStructureImport } from '../components/internal-structure/InternalStructureImport';
import { InternalConfirmationModal } from '../components/internal-structure/InternalConfirmationModal';
import { internalStructureService } from '../services/internalStructureService';
import { toast } from '../../../utils/toast';

const tabs = [
    { key: 'blocks',  label: 'Blocks',         icon: <Building2 size={16} strokeWidth={2.5} /> },
    { key: 'floors',  label: 'Floors',          icon: <Layers    size={16} strokeWidth={2.5} /> },
    { key: 'rooms',   label: 'Rooms',           icon: <DoorOpen  size={16} strokeWidth={2.5} /> },
    { key: 'layout',  label: 'Seating Layout',  icon: <Armchair  size={16} strokeWidth={2.5} /> },
];

const InternalCollegeStructurePage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState('blocks');

    const isRootAdmin = user?.IsRootAdmin === true;
    const isReadOnly = !isRootAdmin;
    const deleteAllModal = useDisclosure();

    const handleDeleteAll = async () => {
        try {
            await internalStructureService.deleteAllInternalStructure();
            toast.success('All Internal Exam infrastructure purged');
            deleteAllModal.onClose();
            window.location.reload();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Purge failed'); }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">

            {/* ─ Header ─ */}
            <div className="pt-10 px-8 max-w-[1920px] mx-auto flex flex-col gap-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 flex items-center justify-center shadow-xl shadow-violet-200 ring-4 ring-white">
                            <Building2 size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Internal Infrastructure</h1>
                            </div>
                            <p className="text-slate-500 text-sm font-medium">Manage classroom blocks, floors, and dual-seating layouts for internal assessments.</p>
                        </div>
                    </div>
                    
                    {isRootAdmin && (
                        <div className="flex items-center gap-3">
                            <InternalStructureImport onChange={() => window.location.reload()} />
                            <Button 
                                color="danger" 
                                variant="solid"
                                className="font-bold px-6 shadow-lg shadow-red-200"
                                onPress={deleteAllModal.onOpen}
                                startContent={<Trash2 size={16} />}
                            >
                                Delete All
                            </Button>
                        </div>
                    )}
                </div>

                {isReadOnly && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 text-amber-800 shadow-sm animate-in zoom-in-95 duration-500">
                        <ShieldAlert className="shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-black text-sm uppercase tracking-wide">Restricted Access</p>
                            <p className="text-xs font-medium opacity-80">You are in read-only mode. Infrastructure modifications require Root Administrator credentials.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─ Dynamic Navigation ─ */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 mt-10 px-8 shadow-sm shadow-slate-100">
                <div className="max-w-[1920px] mx-auto">
                    <Tabs
                        aria-label="Internal Structure Tabs"
                        color="secondary"
                        variant="underlined"
                        classNames={{
                            tabList: 'gap-8 relative rounded-none p-0',
                            cursor: 'w-full bg-violet-600 h-[3px] rounded-t-full',
                            tab: 'max-w-fit px-0 h-14',
                            tabContent: 'group-data-[selected=true]:text-violet-600 group-data-[selected=true]:font-black font-bold text-slate-400 text-xs uppercase tracking-widest'
                        }}
                        selectedKey={selectedTab}
                        onSelectionChange={(k) => setSelectedTab(k.toString())}
                    >
                        {tabs.map(t => (
                            <Tab key={t.key} title={
                                <div className="flex items-center gap-2.5">
                                    {t.icon}<span>{t.label}</span>
                                </div>
                            } />
                        ))}
                    </Tabs>
                </div>
            </div>

            {/* ─ Main Content Area ─ */}
            <div className="px-8 py-10 max-w-[1920px] mx-auto min-h-[600px] transition-all duration-500">
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {selectedTab === 'blocks'  && <InternalBlockManager  readOnly={isReadOnly} />}
                    {selectedTab === 'floors'  && <InternalFloorManager  readOnly={isReadOnly} />}
                    {selectedTab === 'rooms'   && <InternalRoomManager   readOnly={isReadOnly} />}
                    {selectedTab === 'layout'  && <InternalLayoutConfig  readOnly={isReadOnly} />}
                </div>
            </div>

            <InternalConfirmationModal
                isOpen={deleteAllModal.isOpen}
                onOpenChange={deleteAllModal.onOpenChange}
                type="danger"
                title="Nuclear Purge?"
                message="This will permanently delete EVERY Internal Block, Floor, Room, and Seat record."
                details={[
                    "Total wipe of Internal infrastructure",
                    "All seating maps and configurations lost",
                    "Millions of records may be affected",
                    "End Semester data remains untouched"
                ]}
                confirmText="PURGE ALL DATA"
                onConfirm={handleDeleteAll}
            />
        </div>
    );
};

export default InternalCollegeStructurePage;
