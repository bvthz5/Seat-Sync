import React, { useState, useEffect } from 'react';
import { 
    Button, 
    Card, 
    Select, 
    SelectItem, 
    Switch, 
    Checkbox, 
    Divider, 
    Tooltip, 
    Chip, 
    Progress, 
    Modal, 
    ModalContent, 
    ModalHeader, 
    ModalBody, 
    ModalFooter,
    ScrollShadow
} from '@heroui/react';
import { 
    Calendar, 
    Clock, 
    Settings, 
    Users, 
    MapPin, 
    RefreshCcw, 
    Save, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Info, 
    ChevronRight,
    Search,
    Monitor,
    Layers,
    Layout,
    ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { InternalSeatingService } from '../../services/internal/internalSeatingService';
import { SeatingService } from '../../services/seatingService'; // for generic series list if needed
import { academicService } from '../../services/academicService';

const InternalSeatingPlans: React.FC = () => {
    // --- State ---
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<string>('');
    const [examDates, setExamDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<'FN' | 'AN'>('FN');
    
    const [halls, setHalls] = useState<any[]>([]);
    const [hallSearch, setHallSearch] = useState<string>('');
    const [selectedHalls, setSelectedHalls] = useState<number[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    
    // Settings
    const [allocationMode, setAllocationMode] = useState<string>('same-exam');
    const [shuffleRooms, setShuffleRooms] = useState(false);
    const [primaryDept, setPrimaryDept] = useState<string>('');
    const [secondaryDept, setSecondaryDept] = useState<string>('');
    
    // View State
    const [activeStep, setActiveStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hallDetail, setHallDetail] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    // Layout & Stats
    const [stats, setStats] = useState<any>(null);

    // --- Loaders ---
    useEffect(() => {
        (async () => {
            try {
                // Fetch Internal Series
                const series = await SeatingService.getSeries('Internal');
                setSeriesList(series || []);
                
                // Fetch Departments
                const depts = await academicService.getDepartments();
                setDepartments(depts.data || []);
                
                // Fetch Active Halls
                const h = await InternalSeatingService.getHalls();
                setHalls(h || []);
            } catch (e) {
                toast.error("Failed to initialize seating data");
            }
        })();
    }, []);

    useEffect(() => {
        if (selectedSeries) {
            (async () => {
                const dates = await InternalSeatingService.getExamDates(Number(selectedSeries));
                setExamDates(dates || []);
            })();
        }
    }, [selectedSeries]);

    // --- Actions ---
    const handleGenerate = async () => {
        if (!selectedSeries || !selectedDate || selectedHalls.length === 0) {
            toast.error("Please complete selections in the sidebar");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await InternalSeatingService.generate({
                examDate: selectedDate,
                session: selectedSession,
                hallIds: selectedHalls,
                mode: allocationMode,
                seriesId: Number(selectedSeries),
                primaryDeptId: primaryDept ? Number(primaryDept) : undefined,
                secondaryDeptId: secondaryDept ? Number(secondaryDept) : undefined,
                shuffleRooms
            });
            
            toast.success(`Allocated ${result.assignedCount} students across ${result.hallUsage.length} halls`);
            setStats(result);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const openHallDetail = async (hallId: number) => {
        try {
            const detail = await InternalSeatingService.getHallLayout(hallId, selectedDate, selectedSession, Number(selectedSeries));
            setHallDetail(detail);
            setIsDetailOpen(true);
        } catch {
            toast.error("Failed to load hall details");
        }
    };

    // --- Renderers ---
    return (
        <div className="flex h-[calc(100vh-8rem)] w-full gap-6 text-slate-900">
            {/* --- LEFT SIDEBAR (Wizard Control Panel) --- */}
            <aside className="w-96 h-full flex flex-col gap-6">
                <Card className="flex-1 p-8 glass-card border-slate-200/50 shadow-2xl overflow-y-auto custom-scrollbar bg-white/80 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-xl rotate-3">
                            <Layout size={24} />
                        </div>
                        <div>
                            <h2 className="font-black text-2xl tracking-tight text-slate-900 leading-none">Seating Wizard</h2>
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 mt-2 italic">Internal Exam Engine</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-10">
                        {/* Step 1: Exam Selection */}
                        <section className="animate-in fade-in slide-in-from-left duration-500">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-200">1</div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Exam Details</h3>
                            </div>
                            
                            <div className="flex flex-col gap-8 pl-1">
                                {/* Manual Label for Series */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Select Exam Series</label>
                                    <Select 
                                        placeholder="Choose internal series..."
                                        variant="bordered" 
                                        className="max-w-full"
                                        selectedKeys={selectedSeries ? [selectedSeries] : []}
                                        onSelectionChange={(keys) => setSelectedSeries(Array.from(keys)[0] as string)}
                                        classNames={{
                                            trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                            value: "text-slate-700 font-medium",
                                            selectorIcon: "right-3 text-slate-400"
                                        }}
                                        popoverProps={{
                                            classNames: {
                                                content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                            }
                                        }}
                                    >
                                        {seriesList.map(s => (
                                            <SelectItem key={s.ExamSeriesID} textValue={s.SeriesName} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">{s.SeriesName}</SelectItem>
                                        ))}
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Exam Date</label>
                                        <Select 
                                            placeholder="Pick date"
                                            variant="bordered"
                                            selectedKeys={selectedDate ? [selectedDate] : []}
                                            onSelectionChange={(keys) => setSelectedDate(Array.from(keys)[0] as string)}
                                            classNames={{
                                                trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                                value: "text-slate-700 font-medium",
                                                selectorIcon: "right-3 text-slate-400"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                                }
                                            }}
                                        >
                                            {examDates.map(d => (
                                                <SelectItem key={d} textValue={d} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">{d}</SelectItem>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Session</label>
                                        <Select 
                                            placeholder="Select slot"
                                            variant="bordered"
                                            selectedKeys={[selectedSession]}
                                            onSelectionChange={(keys) => setSelectedSession(Array.from(keys)[0] as any)}
                                            classNames={{
                                                trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                                value: "text-slate-700 font-medium",
                                                selectorIcon: "right-3 text-slate-400"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                                }
                                            }}
                                        >
                                            <SelectItem key="FN" textValue="Forenoon" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Forenoon (FN)</SelectItem>
                                            <SelectItem key="AN" textValue="Afternoon" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Afternoon (AN)</SelectItem>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Step 2: Room Settings */}
                        <section className="animate-in fade-in slide-in-from-left duration-500 delay-150">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-100">2</div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Hall Infrastructure</h3>
                            </div>
                            
                            <div className="flex flex-col gap-8 pl-1">
                                <div className="flex items-center justify-between p-5 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all duration-300">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-800">Shuffle Rooms</span>
                                        <span className="text-[10px] text-slate-400 font-bold mt-1 italic">Randomize sequence</span>
                                    </div>
                                    <Switch 
                                        isSelected={shuffleRooms} 
                                        onValueChange={setShuffleRooms} 
                                        color="primary"
                                        classNames={{
                                            wrapper: "group-data-[selected=true]:bg-indigo-600",
                                        }}
                                    />
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-1 mb-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hall Search & Bulk Actions</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedHalls(halls.filter(h => h.RoomCode.toLowerCase().includes(hallSearch.toLowerCase())).map(h => h.RoomID))}
                                                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-tight"
                                                >
                                                    Select All
                                                </button>
                                                <Divider orientation="vertical" className="h-2 bg-slate-200" />
                                                <button 
                                                    onClick={() => setSelectedHalls([])}
                                                    className="text-[9px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tight"
                                                >
                                                    Undo All
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-400 transition-colors" size={14} />
                                            <input 
                                                type="text"
                                                placeholder="Search by hall name or code..."
                                                value={hallSearch}
                                                onChange={(e) => setHallSearch(e.target.value)}
                                                className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Available Halls</label>
                                            <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                                                {halls.filter(h => h.RoomCode.toLowerCase().includes(hallSearch.toLowerCase())).length} Found
                                            </span>
                                        </div>
                                        <ScrollShadow className="h-60 p-4 border-2 border-slate-100 rounded-3xl bg-slate-50/30">
                                            <div className="grid grid-cols-1 gap-2">
                                                {halls
                                                    .filter(hall => hall.RoomCode.toLowerCase().includes(hallSearch.toLowerCase()))
                                                    .map(hall => (
                                                        <div 
                                                            key={hall.RoomID}
                                                            onClick={() => {
                                                                if (selectedHalls.includes(hall.RoomID)) {
                                                                    setSelectedHalls(selectedHalls.filter(id => id !== hall.RoomID));
                                                                } else {
                                                                    setSelectedHalls([...selectedHalls, hall.RoomID]);
                                                                }
                                                            }}
                                                            className={`
                                                                flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-300
                                                                ${selectedHalls.includes(hall.RoomID) 
                                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100' 
                                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${selectedHalls.includes(hall.RoomID) ? 'bg-white' : 'bg-emerald-500'} animate-pulse`} />
                                                                <span className="text-xs font-black tracking-tight">{hall.RoomCode}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${selectedHalls.includes(hall.RoomID) ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                {hall.TotalCapacity} Seats
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </ScrollShadow>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Step 3: Distribution Logic */}
                        <section className="animate-in fade-in slide-in-from-left duration-500 delay-300">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-100">3</div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Allocation Engine</h3>
                            </div>

                            <div className="flex flex-col gap-8 pl-1">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Distribution Mode</label>
                                    <Select 
                                        placeholder="Choose logic..."
                                        variant="bordered"
                                        selectedKeys={[allocationMode]}
                                        onSelectionChange={(keys) => setAllocationMode(Array.from(keys)[0] as string)}
                                        classNames={{
                                            trigger: "h-12 border-slate-200 hover:border-indigo-400 transition-colors bg-white shadow-sm",
                                            value: "text-slate-700 font-medium",
                                            selectorIcon: "right-3 text-slate-400"
                                        }}
                                        popoverProps={{
                                            classNames: {
                                                content: "bg-white border border-slate-200 shadow-2xl p-2 rounded-2xl opacity-100",
                                            }
                                        }}
                                    >
                                        <SelectItem key="same-exam" textValue="Same Exam Both Sides" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Same Exam Both Sides</SelectItem>
                                        <SelectItem key="alternate" textValue="Alternate Subjects" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Alternate Subjects</SelectItem>
                                        <SelectItem key="left-only" textValue="Left Side Only" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Left Side Only</SelectItem>
                                        <SelectItem key="right-only" textValue="Right Side Only" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Right Side Only</SelectItem>
                                        <SelectItem key="split-dept" textValue="Split By Department" className="font-medium text-slate-700 hover:bg-indigo-50 rounded-xl transition-colors">Split By Department</SelectItem>
                                    </Select>
                                </div>

                                {allocationMode === 'split-dept' && (
                                    <div className="grid grid-cols-1 gap-4 animate-in zoom-in-95 duration-300">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Primary Department</label>
                                            <Select 
                                                variant="bordered"
                                                size="sm"
                                                placeholder="Choose department..."
                                                onSelectionChange={(keys) => setPrimaryDept(Array.from(keys)[0] as string)}
                                                classNames={{
                                                    trigger: "h-10 border-slate-200 bg-white",
                                                    value: "text-slate-700 font-medium",
                                                    selectorIcon: "right-2 text-slate-400"
                                                }}
                                                popoverProps={{
                                                    classNames: {
                                                        content: "bg-white border border-slate-200 shadow-2xl p-1 rounded-xl opacity-100",
                                                    }
                                                }}
                                            >
                                                {departments.map(d => <SelectItem key={d.DepartmentID} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors">{d.DepartmentCode}</SelectItem>)}
                                            </Select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Secondary Department</label>
                                            <Select 
                                                variant="bordered"
                                                size="sm"
                                                placeholder="Choose department..."
                                                onSelectionChange={(keys) => setSecondaryDept(Array.from(keys)[0] as string)}
                                                classNames={{
                                                    trigger: "h-10 border-slate-200 bg-white",
                                                    value: "text-slate-700 font-medium",
                                                    selectorIcon: "right-2 text-slate-400"
                                                }}
                                                popoverProps={{
                                                    classNames: {
                                                        content: "bg-white border border-slate-200 shadow-2xl p-1 rounded-xl opacity-100",
                                                    }
                                                }}
                                            >
                                                {departments.map(d => <SelectItem key={d.DepartmentID} className="font-medium text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors">{d.DepartmentCode}</SelectItem>)}
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100">
                        <Button 
                            color="primary" 
                            fullWidth 
                            size="lg" 
                            className="font-black h-16 rounded-[2rem] shadow-2xl shadow-indigo-200 text-base tracking-wider uppercase group"
                            isLoading={isGenerating}
                            onPress={handleGenerate}
                            startContent={!isGenerating && <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />}
                        >
                            Generate Arrangement
                        </Button>
                    </div>
                </Card>
            </aside>

            {/* --- MAIN DASHBOARD (Hall Grid & Preview) --- */}
            <main className="flex-1 flex flex-col gap-6">
                {/* Statistics Banner */}
                {stats ? (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-4 gap-4"
                    >
                        <Card className="p-4 glass-card border-emerald-100 bg-emerald-50/30 flex flex-row items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-emerald-600 leading-none">{stats.assignedCount}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-1">Students Seated</p>
                            </div>
                        </Card>
                        <Card className="p-4 glass-card border-orange-100 bg-orange-50/30 flex flex-row items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-orange-600 leading-none">{stats.unassignedCount}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mt-1">Unassigned</p>
                            </div>
                        </Card>
                        <Card className="p-4 glass-card border-indigo-100 bg-indigo-50/30 flex flex-row items-center gap-4 col-span-2">
                             <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Global Utilization</span>
                                    <span className="text-xs font-bold text-indigo-700">
                                        {Math.round((stats.assignedCount / (stats.assignedCount + stats.unassignedCount || 1)) * 100)}%
                                    </span>
                                </div>
                                <Progress 
                                    value={(stats.assignedCount / (stats.assignedCount + stats.unassignedCount || 1)) * 100} 
                                    color="secondary" 
                                    className="h-2"
                                />
                             </div>
                        </Card>
                    </motion.div>
                ) : (
                    <Card className="p-12 glass-card border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4 animate-pulse">
                            <Monitor size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-600">No Seating Generated</h3>
                        <p className="text-sm text-slate-400 max-w-xs mt-2 italic">Select your criteria on the left and click "Generate" to start the allocation engine.</p>
                    </Card>
                )}

                {/* Hall Grid */}
                <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {stats?.hallUsage.map((h: any) => (
                            <motion.div key={h.hallId} whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
                                <Card className="overflow-hidden glass-card border-slate-200/50 hover:border-indigo-200 transition-all shadow-xl group">
                                    <div className="p-5 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-base text-slate-800">{h.hallCode}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Internal Exam Hall</p>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="flat" 
                                            color="secondary"
                                            className="font-black text-[10px] uppercase tracking-wider h-8"
                                            onPress={() => openHallDetail(h.hallId)}
                                        >
                                            View Layout
                                        </Button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hall Occupancy</span>
                                            <span className="text-sm font-black text-indigo-600">{h.used} / {h.total}</span>
                                        </div>
                                        <Progress 
                                            value={(h.used / h.total) * 100} 
                                            color={h.used === h.total ? 'secondary' : 'primary'} 
                                            className="h-2"
                                        />
                                        <div className="flex gap-2">
                                            <Chip size="sm" variant="flat" color="primary" className="text-[9px] font-black px-1 uppercase tracking-tighter">
                                                {h.used} Seats Used
                                            </Chip>
                                            <Chip size="sm" variant="flat" color="default" className="text-[9px] font-black px-1 uppercase tracking-tighter">
                                                {h.total - h.used} Available
                                            </Chip>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            {/* --- HALL DETAIL MODAL (Blueprint View) --- */}
            <Modal 
                isOpen={isDetailOpen} 
                onOpenChange={setIsDetailOpen} 
                size="5xl" 
                scrollBehavior="inside"
                classNames={{
                    base: "glass-card border-slate-200/50 shadow-2xl",
                    header: "border-b border-slate-100 bg-slate-50/50",
                    footer: "border-t border-slate-100 bg-slate-50/50"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex items-center gap-4 p-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                                    <Layout size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-none">{hallDetail?.room?.RoomCode}</h3>
                                    <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1.5 italic">Real-Time Blueprint Visualization</p>
                                </div>
                            </ModalHeader>
                            <ModalBody className="p-8 bg-slate-50/30 overflow-hidden">
                                {/* Blueprint Legend */}
                                <div className="flex gap-6 mb-8 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-indigo-500" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Occupied</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded border-2 border-indigo-200 bg-white" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Available</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Disabled</span>
                                    </div>
                                    <Divider orientation="vertical" className="h-4" />
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft size={14} className="text-indigo-400" />
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Dual Seating (L/R)</span>
                                    </div>
                                </div>

                                {/* The Actual Blueprint Visualization */}
                                <div className="relative bg-[#0f172a] rounded-3xl p-12 border-4 border-slate-800 shadow-2xl min-h-[600px] overflow-auto custom-scrollbar group">
                                    {/* Blueprint Grid Lines */}
                                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                                        style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 0)', backgroundSize: '24px 24px' }} 
                                    />
                                    
                                    {/* Blackboard */}
                                    <div className="mx-auto w-1/3 h-4 bg-slate-700 rounded-b-xl mb-24 relative flex justify-center border-b-4 border-slate-600 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)]">
                                        <div className="absolute -top-12 text-[10px] font-black text-slate-500 tracking-[0.5em] uppercase opacity-50">Blackboard / Front</div>
                                    </div>

                                    {/* Classroom Layout Renderer */}
                                    <div className="flex flex-wrap justify-center gap-16 relative">
                                        {hallDetail && (() => {
                                            const benchGroups: Record<string, any[]> = {};
                                            hallDetail.seats.forEach((s: any) => {
                                                if (!benchGroups[s.RowLabel]) benchGroups[s.RowLabel] = [];
                                                // Find existing bench or create
                                                let bench = benchGroups[s.RowLabel].find(b => b.num === s.BenchNumber);
                                                if (!bench) {
                                                    bench = { num: s.BenchNumber, left: null, right: null };
                                                    benchGroups[s.RowLabel].push(bench);
                                                }
                                                if (s.SeatNumber === 1) bench.left = s;
                                                else bench.right = s;
                                            });

                                            return Object.entries(benchGroups).sort(([a], [b]) => a.localeCompare(b)).map(([col, benches]) => (
                                                <div key={col} className="flex flex-col gap-8">
                                                    <div className="text-center mb-4">
                                                        <span className="px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black tracking-widest">COLUMN {col}</span>
                                                    </div>
                                                    {benches.sort((a, b) => a.num - b.num).map(bench => (
                                                        <div key={bench.num} className="flex gap-1 relative p-1 rounded-xl border-2 border-transparent hover:border-slate-700 hover:bg-slate-800/30 transition-all duration-300">
                                                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 opacity-50">B{bench.num}</div>
                                                            {/* Left Seat */}
                                                            <SeatIcon 
                                                                seat={bench.left} 
                                                                allocation={hallDetail.allocations.find((a: any) => a.InternalSeatID === bench.left?.SeatID)}
                                                            />
                                                            {/* Right Seat */}
                                                            <SeatIcon 
                                                                seat={bench.right} 
                                                                allocation={hallDetail.allocations.find((a: any) => a.InternalSeatID === bench.right?.SeatID)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="p-6">
                                <Button color="danger" variant="flat" className="font-bold" onPress={onClose}>Close Visualizer</Button>
                                <Button color="primary" className="font-black px-8" startContent={<Save size={18} />}>Save Layout</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

// --- Sub-Components ---
const SeatIcon: React.FC<{ seat: any, allocation: any }> = ({ seat, allocation }) => {
    if (!seat) return <div className="w-14 h-14" />; // Spacer

    const isOccupied = !!allocation;
    const isDisabled = !seat.IsActive;

    const content = (
        <motion.div 
            whileHover={{ scale: 1.1, rotate: isOccupied ? 2 : 0 }}
            className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-xs transition-all duration-500 cursor-pointer border-2
                ${isDisabled 
                    ? 'bg-red-900/20 border-red-800/30 text-red-700 opacity-50' 
                    : isOccupied 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_5px_15px_rgba(79,70,229,0.3)]' 
                        : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-700 hover:border-slate-600'}
            `}
        >
            {isOccupied ? (
                <div className="flex flex-col items-center leading-none">
                    <span className="font-black text-[9px] truncate w-10 text-center">{allocation.Student?.RegisterNumber?.slice(-3)}</span>
                    <Users size={12} className="mt-1 opacity-50" />
                </div>
            ) : (
                <span className="font-black opacity-30 text-[10px]">{seat.SeatNumber === 1 ? 'L' : 'R'}</span>
            )}
        </motion.div>
    );

    if (isOccupied) {
        return (
            <Tooltip 
                content={
                    <div className="p-3 space-y-1">
                        <p className="font-black text-indigo-400 text-xs mb-1">{allocation.Student?.FullName}</p>
                        <p className="text-[10px] font-bold text-slate-300">Reg: {allocation.Student?.RegisterNumber}</p>
                        <p className="text-[10px] font-bold text-slate-300">Dept: {allocation.Student?.Department?.DepartmentCode}</p>
                        <p className="text-[10px] font-bold text-slate-300">Seat ID: {seat.SeatID}</p>
                    </div>
                }
                classNames={{ content: "bg-slate-900 border border-slate-800 p-0" }}
                placement="top"
            >
                {content}
            </Tooltip>
        );
    }

    return content;
};

export default InternalSeatingPlans;
