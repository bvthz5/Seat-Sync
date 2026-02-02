import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    CardBody,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Input,
    User as UserAvatar,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Spinner,
    Pagination,
    Select,
    SelectItem,
    Tabs,
    Tab
} from '@heroui/react';
import {
    Plus,
    Search,
    MoreVertical,
    Trash2,
    AlertTriangle,
    Mail,
    ShieldCheck,
    Users,
    Activity,
    UserMinus,
    Flag,
    CheckCircle2,
    Clock,
    FileText,
    Download,
    Eye,
    Calendar,
    ChevronDown,
    Briefcase,
    Filter,
    Building2,
    GraduationCap,
    Award,
    UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invigilatorService, Invigilator, InvigilatorStats } from '../services/invigilatorService';

const Invigilators: React.FC = () => {
    const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
    const [stats, setStats] = useState<InvigilatorStats>({
        total: 0,
        active: 0,
        eligible: 0,
        onDuty: 0,
        flagged: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [selectedAvailability, setSelectedAvailability] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("all");
    const [page, setPage] = useState(1);
    const rowsPerPage = 5;

    // Modals
    const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onOpenDelete, onClose: onCloseDelete } = useDisclosure();
    const { isOpen: isDetailsOpen, onOpen: onOpenDetails, onClose: onCloseDetails } = useDisclosure();
    const { isOpen: isAssignmentsOpen, onOpen: onOpenAssignments, onClose: onCloseAssignments } = useDisclosure();
    const [selectedInvigilator, setSelectedInvigilator] = useState<Invigilator | null>(null);

    // Form State
    const [newInvigilator, setNewInvigilator] = useState({
        FullName: "",
        Email: "",
        Password: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [data, statData] = await Promise.all([
                invigilatorService.getAll(),
                invigilatorService.getStats()
            ]);
            setInvigilators(data);
            setStats(statData);
        } catch (error) {
            console.error("Failed to fetch invigilators", error);
            toast.error("Failed to load invigilators");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddInvigilator = async () => {
        if (!newInvigilator.FullName || !newInvigilator.Email || !newInvigilator.Password) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            await invigilatorService.create(newInvigilator);
            toast.success("Invigilator added successfully");
            onAddClose();
            setNewInvigilator({ FullName: "", Email: "", Password: "" });
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add invigilator");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleFlag = async (id: number) => {
        try {
            const result = await invigilatorService.toggleFlag(id);
            setInvigilators(prev => prev.map(inv =>
                inv.InvigilatorID === id ? { ...inv, isFlagged: result.isFlagged } : inv
            ));
            toast.success(result.message);
            const statData = await invigilatorService.getStats();
            setStats(statData);
        } catch (error) {
            toast.error("Failed to update flag status");
        }
    };

    const handleDelete = async () => {
        if (!selectedInvigilator) return;
        setIsSubmitting(true);
        try {
            await invigilatorService.delete(selectedInvigilator.InvigilatorID);
            toast.success("Invigilator removed successfully");
            onCloseDelete();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to remove invigilator");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewDetails = (invigilator: Invigilator) => {
        setSelectedInvigilator(invigilator);
        onOpenDetails();
    };

    const handleViewAssignments = (invigilator: Invigilator) => {
        setSelectedInvigilator(invigilator);
        onOpenAssignments();
    };

    const handleToggleEligibility = async (invigilatorId: number) => {
        try {
            const invigilator = invigilators.find(inv => inv.InvigilatorID === invigilatorId);
            if (!invigilator) return;

            await invigilatorService.toggleEligibility(invigilatorId);
            toast.success(`${invigilator.Name} marked as ${invigilator.isEligible ? 'ineligible' : 'eligible'}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to toggle eligibility');
        }
    };

    // Get unique departments for filter dropdown
    const uniqueDepartments = React.useMemo(() => {
        const depts = invigilators
            .map(inv => inv.Department)
            .filter((dept, index, self) =>
                dept && self.findIndex(d => d?.DepartmentID === dept.DepartmentID) === index
            );
        return depts as NonNullable<typeof depts[0]>[];
    }, [invigilators]);

    const filteredInvigilators = invigilators.filter(inv => {
        // Search filter
        const matchesSearch = !searchQuery ||
            inv.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.Designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.Department?.DepartmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.Department?.DepartmentCode?.toLowerCase().includes(searchQuery.toLowerCase());

        // Department filter
        const matchesDepartment = !selectedDepartment ||
            inv.Department?.DepartmentID.toString() === selectedDepartment;

        // Availability filter
        let matchesAvailability = true;
        if (selectedAvailability === "available") {
            matchesAvailability = inv.isEligible && !inv.isOnDuty;
        } else if (selectedAvailability === "assigned") {
            matchesAvailability = inv.isOnDuty === true;
        } else if (selectedAvailability === "ineligible") {
            matchesAvailability = !inv.isEligible;
        }

        return matchesSearch && matchesDepartment && matchesAvailability;
    });

    const pages = Math.ceil(filteredInvigilators.length / rowsPerPage);
    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredInvigilators.slice(start, end);
    }, [page, filteredInvigilators]);

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto p-6 bg-[#F9FAFB] min-h-screen">
            {/* Top Navigation / Search Header */}
            <div className="flex items-center justify-between gap-4 mb-2">
                <div className="relative w-full max-w-xl">
                    <Input
                        id="search-invigilators"
                        name="search-invigilators"
                        classNames={{
                            inputWrapper: "bg-white border-1 border-gray-200 shadow-sm rounded-xl h-11",
                        }}
                        placeholder="Search staff members, departments..."
                        startContent={<Search size={18} className="text-gray-400" />}
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        aria-label="Search invigilators"
                    />
                </div>
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invigilator Management</h1>
                    <p className="text-gray-500 text-sm">Manage staff eligibility, performance, and current assignments.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="bordered"
                        className="bg-white border-gray-200 text-gray-700 font-semibold h-11 px-6 rounded-xl shadow-sm"
                        startContent={<Download size={18} />}
                    >
                        Export Report
                    </Button>
                    <Button
                        className="bg-[#1e40af] text-white font-semibold h-11 px-6 rounded-xl shadow-md"
                        startContent={<Plus size={18} />}
                        onPress={onAddOpen}
                    >
                        Add Invigilator
                    </Button>
                </div>
            </div>

            {/* Tabs Section */}
            <div className="mt-6">
                <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(key as string)}
                    variant="underlined"
                    classNames={{
                        tabList: "gap-8 w-full relative rounded-none p-0 border-b border-gray-200",
                        cursor: "w-full bg-blue-600 h-1",
                        tab: "max-w-fit px-0 h-12",
                        tabContent: "group-data-[selected=true]:text-blue-600 font-semibold text-gray-500"
                    }}
                >
                    <Tab
                        key="all"
                        title={
                            <div className="flex items-center gap-2">
                                <Users size={18} />
                                <span>All Invigilators</span>
                                <Chip size="sm" variant="flat" className="bg-gray-100 text-gray-600 font-bold text-xs">
                                    {stats.total}
                                </Chip>
                            </div>
                        }
                    />
                    <Tab
                        key="requests"
                        title={
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                <span>Requests</span>
                                <Chip size="sm" variant="flat" className="bg-blue-100 text-blue-600 font-bold text-xs">
                                    3
                                </Chip>
                            </div>
                        }
                    />
                </Tabs>
            </div>

            {/* Content based on active tab */}
            {activeTab === "all" ? (
                <>
                    {/* Stats Cards Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden py-2">
                            <CardBody className="flex flex-row items-center gap-5 p-6 relative">
                                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Briefcase size={24} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-[0.1em] uppercase absolute top-6 right-6">GLOBAL</span>
                                    <span className="text-sm font-semibold text-gray-500">Total Invigilators</span>
                                    <span className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</span>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden py-2">
                            <CardBody className="flex flex-row items-center gap-5 p-6 relative">
                                <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                                    <ShieldCheck size={24} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-[0.1em] uppercase absolute top-6 right-6">ACTIVE</span>
                                    <span className="text-sm font-semibold text-gray-500">Eligible/Available</span>
                                    <span className="text-3xl font-bold text-gray-900 mt-1">{stats.eligible}</span>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden py-2">
                            <CardBody className="flex flex-row items-center gap-5 p-6 relative">
                                <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                    <Users size={24} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-[0.1em] uppercase absolute top-6 right-6">LIVE</span>
                                    <span className="text-sm font-semibold text-gray-500">On Duty</span>
                                    <span className="text-3xl font-bold text-gray-900 mt-1">{stats.onDuty}</span>
                                </div>
                            </CardBody>
                        </Card>

                        <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden py-2">
                            <CardBody className="flex flex-row items-center gap-5 p-6 relative">
                                <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                    <AlertTriangle size={24} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-[0.1em] uppercase absolute top-6 right-6">RESTRICTED</span>
                                    <span className="text-sm font-semibold text-gray-500">Flagged/Unavailable</span>
                                    <span className="text-3xl font-bold text-gray-900 mt-1">{stats.flagged}</span>
                                </div>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 px-3">
                                <span className="text-sm font-bold text-gray-600">Filters:</span>
                            </div>
                            <Select
                                id="filter-department"
                                name="filter-department"
                                placeholder="All Departments"
                                size="sm"
                                className="w-56"
                                variant="bordered"
                                selectorIcon={<span />}
                                aria-label="Filter by department"
                                popoverProps={{
                                    classNames: {
                                        base: "z-[9999]",
                                        content: "z-[9999] bg-white"
                                    }
                                }}
                                listboxProps={{
                                    classNames: {
                                        base: "max-h-[300px] overflow-auto"
                                    }
                                }}
                                selectedKeys={selectedDepartment ? new Set([selectedDepartment]) : new Set()}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys as Set<string>)[0];
                                    setSelectedDepartment(selected || "");
                                }}
                            >
                                {uniqueDepartments.map((dept) => (
                                    <SelectItem key={dept.DepartmentID.toString()}>
                                        {dept.DepartmentCode}
                                    </SelectItem>
                                ))}
                            </Select>

                            <Select
                                id="filter-availability"
                                name="filter-availability"
                                placeholder="Availability Status"
                                size="sm"
                                className="w-56"
                                variant="bordered"
                                selectorIcon={<span />}
                                aria-label="Filter by availability"
                                popoverProps={{
                                    classNames: {
                                        base: "z-[9999]",
                                        content: "z-[9999] bg-white"
                                    }
                                }}
                                listboxProps={{
                                    classNames: {
                                        base: "max-h-[300px] overflow-auto"
                                    }
                                }}
                                selectedKeys={selectedAvailability ? new Set([selectedAvailability]) : new Set()}
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys as Set<string>)[0];
                                    setSelectedAvailability(selected || "");
                                }}
                            >
                                <SelectItem key="available">Available</SelectItem>
                                <SelectItem key="assigned">Assigned</SelectItem>
                                <SelectItem key="ineligible">Ineligible</SelectItem>
                            </Select>
                        </div>
                        <Button
                            variant="light"
                            color="primary"
                            className="font-bold text-sm"
                            onPress={() => {
                                setSearchQuery("");
                                setSelectedDepartment("");
                                setSelectedAvailability("");
                            }}
                        >
                            Clear All
                        </Button>
                    </div>

                    {/* Table Section */}
                    <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden h-fit">
                        <Table
                            aria-label="Invigilator Management Table"
                            shadow="none"
                            classNames={{
                                th: "bg-[#F9FAFB] text-gray-400 font-bold text-[10px] h-14 uppercase tracking-wider px-8",
                                td: "py-5 px-8",
                                tr: "border-b border-gray-100 hover:bg-gray-50/50 transition-colors last:border-none",
                            }}
                        >
                            <TableHeader>
                                <TableColumn>NAME</TableColumn>
                                <TableColumn>DEPARTMENT</TableColumn>
                                <TableColumn>TOTAL EXAMS</TableColumn>
                                <TableColumn>STATUS</TableColumn>
                                <TableColumn align="end">ACTIONS</TableColumn>
                            </TableHeader>
                            <TableBody
                                emptyContent={isLoading ? <Spinner /> : "No staff members found matching your criteria."}
                                items={items}
                            >
                                {(item) => (
                                    <TableRow key={item.InvigilatorID}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 min-w-[40px] rounded-lg overflow-hidden bg-slate-200 ring-2 ring-white shadow-sm">
                                                    <img
                                                        src={item.ProfileImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.Name)}&background=f1f5f9&color=64748b&bold=true`}
                                                        alt={item.Name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.Name)}&background=f1f5f9&color=64748b&bold=true`;
                                                        }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900">{item.Name}</p>
                                                    <span className="text-gray-400 text-xs">{item.Designation}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium text-gray-600">
                                                {item.Department?.DepartmentName || "Not Assigned"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-bold text-gray-900 mx-auto block text-center max-w-[40px]">
                                                {item.totalExams || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {(!item.isEligible) ? (
                                                <Chip
                                                    variant="flat"
                                                    className="bg-rose-50 text-rose-600 font-bold text-[10px] h-6 px-3 border-none"
                                                >
                                                    INELIGIBLE
                                                </Chip>
                                            ) : item.isFlagged ? (
                                                <Chip
                                                    variant="flat"
                                                    className="bg-amber-50 text-amber-600 font-bold text-[10px] h-6 px-3 border-none"
                                                >
                                                    ON LEAVE
                                                </Chip>
                                            ) : item.isOnDuty ? (
                                                <Chip
                                                    variant="flat"
                                                    className="bg-blue-50 text-blue-600 font-bold text-[10px] h-6 px-3 border-none"
                                                >
                                                    ASSIGNED
                                                </Chip>
                                            ) : (
                                                <Chip
                                                    variant="flat"
                                                    className="bg-emerald-50 text-emerald-600 font-bold text-[10px] h-6 px-3 border-none"
                                                >
                                                    AVAILABLE
                                                </Chip>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end items-center gap-1">
                                                {/* View Details */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="text-gray-400 hover:text-blue-600"
                                                    onPress={() => handleViewDetails(item)}
                                                    title="View full profile details"
                                                >
                                                    <Eye size={18} />
                                                </Button>

                                                {/* Toggle Eligibility */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className={item.isEligible ? "text-emerald-500 hover:text-emerald-600" : "text-gray-400 hover:text-emerald-500"}
                                                    onPress={() => handleToggleEligibility(item.InvigilatorID)}
                                                    title={item.isEligible ? "Mark as ineligible" : "Mark as eligible"}
                                                >
                                                    {item.isEligible ? <CheckCircle2 size={18} /> : <UserMinus size={18} />}
                                                </Button>

                                                {/* View Assignments */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="text-gray-400 hover:text-purple-600"
                                                    onPress={() => handleViewAssignments(item)}
                                                    title="View exam assignments"
                                                >
                                                    <Calendar size={18} />
                                                </Button>

                                                {/* Flag/Unflag */}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className={item.isFlagged ? "text-rose-500 bg-rose-50" : "text-gray-300 hover:text-rose-400"}
                                                    onPress={() => handleToggleFlag(item.InvigilatorID)}
                                                    title={item.isFlagged ? "Remove flag" : "Flag for review"}
                                                >
                                                    {item.isFlagged ? <AlertTriangle size={18} fill="currentColor" /> : <ShieldCheck size={18} />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Footer Section */}
                        <div className="flex flex-row justify-between items-center p-6 bg-white border-t border-gray-100">
                            <span className="text-xs font-semibold text-gray-400">
                                Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredInvigilators.length)} of {filteredInvigilators.length} invigilators
                            </span>
                            <Pagination
                                total={pages}
                                page={page}
                                onChange={setPage}
                                classNames={{
                                    wrapper: "gap-1",
                                    item: "bg-transparent text-gray-500 font-bold text-xs w-8 h-8 min-w-[32px]",
                                    cursor: "bg-blue-800 text-white font-bold text-xs w-8 h-8 rounded-lg",
                                }}
                            />
                        </div>
                    </Card>
                </>
            ) : (
                // Requests View
                <div className="mt-6">
                    <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden">
                        <CardBody className="p-12">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                                    <FileText size={40} className="text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Invigilator Requests</h3>
                                <p className="text-gray-500 mb-6">View and manage pending invigilator registration requests</p>
                                <div className="flex items-center justify-center gap-4 mb-8">
                                    <Chip variant="flat" className="bg-blue-100 text-blue-700 font-semibold px-4 py-2">
                                        3 Pending Requests
                                    </Chip>
                                </div>
                                <p className="text-sm text-gray-400">Backend integration required to display requests</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Modals remain mostly the same but with refined styling */}
            <Modal isOpen={isAddOpen} onClose={onAddClose} size="md">
                <ModalContent className="rounded-3xl">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 pt-8 px-8">
                                <h2 className="text-xl font-bold text-gray-900">Add Invigilator</h2>
                                <p className="text-sm font-normal text-gray-500">Create a new system user with invigilator permissions.</p>
                            </ModalHeader>
                            <ModalBody className="py-6 px-8">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="fullName" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            autoComplete="name"
                                            placeholder="e.g. John Doe"
                                            value={newInvigilator.FullName}
                                            onValueChange={(val) => setNewInvigilator({ ...newInvigilator, FullName: val })}
                                            variant="bordered"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="john.doe@college.edu"
                                            value={newInvigilator.Email}
                                            onValueChange={(val) => setNewInvigilator({ ...newInvigilator, Email: val })}
                                            variant="bordered"
                                            startContent={<Mail size={18} className="text-gray-400" />}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="password" className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Initial Password</label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="new-password"
                                            placeholder="••••••••"
                                            value={newInvigilator.Password}
                                            onValueChange={(val) => setNewInvigilator({ ...newInvigilator, Password: val })}
                                            variant="bordered"
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="pb-8 px-8 pt-2">
                                <Button variant="light" onPress={onClose} className="font-bold text-gray-500">Cancel</Button>
                                <Button
                                    className="bg-blue-800 text-white font-bold rounded-xl px-6"
                                    onPress={handleAddInvigilator}
                                    isLoading={isSubmitting}
                                >
                                    Confirm Addition
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal isOpen={isDeleteOpen} onClose={onCloseDelete} size="sm">
                <ModalContent className="rounded-3xl">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 items-center pt-10 px-8">
                                <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                                    <UserMinus size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Remove Invigilator?</h3>
                            </ModalHeader>
                            <ModalBody className="text-center px-8 pb-4">
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Are you sure you want to remove <span className="font-bold text-gray-900">{selectedInvigilator?.Name}</span>?
                                    This action cannot be undone.
                                </p>
                            </ModalBody>
                            <ModalFooter className="justify-center gap-3 pb-10 pt-4 px-8">
                                <Button variant="light" onPress={onClose} className="font-bold text-gray-400">Cancel</Button>
                                <Button
                                    className="bg-rose-500 text-white font-bold rounded-xl px-6 shadow-md shadow-rose-100"
                                    onPress={handleDelete}
                                    isLoading={isSubmitting}
                                >
                                    Remove Account
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* View Details Modal */}
            <Modal
                isOpen={isDetailsOpen}
                onClose={onCloseDetails}
                size="2xl"
                backdrop="opaque"
                scrollBehavior="inside"
                classNames={{
                    wrapper: "z-[9999]",
                    backdrop: "z-[9998] bg-black/80"
                }}
            >
                <ModalContent className="rounded-3xl bg-white">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-2 pt-6 px-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                                <h2 className="text-2xl font-bold text-gray-900">Invigilator Profile</h2>
                                <p className="text-sm text-gray-500">Complete information and assignment details</p>
                            </ModalHeader>
                            <ModalBody className="py-8 px-6 bg-white">
                                {selectedInvigilator && (
                                    <div className="space-y-8">
                                        {/* Profile Header */}
                                        <div className="flex items-start gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white ring-4 ring-white shadow-lg">
                                                <img
                                                    src={selectedInvigilator.ProfileImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedInvigilator.Name)}&background=3b82f6&color=fff&bold=true&size=128`}
                                                    alt={selectedInvigilator.Name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedInvigilator.Name)}&background=3b82f6&color=fff&bold=true&size=128`;
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedInvigilator.Name}</h3>
                                                <div className="flex items-center gap-2 text-gray-600 mb-3">
                                                    <GraduationCap size={16} className="text-blue-600" />
                                                    <p className="text-sm font-medium">{selectedInvigilator.Designation}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {selectedInvigilator.isEligible ? (
                                                        <Chip
                                                            variant="flat"
                                                            startContent={<CheckCircle2 size={14} />}
                                                            className="bg-emerald-100 text-emerald-700 font-semibold text-xs px-3 py-1"
                                                        >
                                                            ELIGIBLE
                                                        </Chip>
                                                    ) : (
                                                        <Chip
                                                            variant="flat"
                                                            startContent={<AlertTriangle size={14} />}
                                                            className="bg-rose-100 text-rose-700 font-semibold text-xs px-3 py-1"
                                                        >
                                                            INELIGIBLE
                                                        </Chip>
                                                    )}
                                                    {selectedInvigilator.isOnDuty && (
                                                        <Chip
                                                            variant="flat"
                                                            startContent={<Clock size={14} />}
                                                            className="bg-blue-100 text-blue-700 font-semibold text-xs px-3 py-1"
                                                        >
                                                            ON DUTY
                                                        </Chip>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Information Grid */}
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Department */}
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <Building2 size={18} className="text-blue-600" />
                                                    </div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label>
                                                </div>
                                                <p className="text-base font-semibold text-gray-900 ml-10">
                                                    {selectedInvigilator.Department?.DepartmentName || 'Not Assigned'}
                                                </p>
                                            </div>

                                            {/* Total Exams */}
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 bg-purple-100 rounded-lg">
                                                        <Calendar size={18} className="text-purple-600" />
                                                    </div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Exams</label>
                                                </div>
                                                <p className="text-base font-semibold text-gray-900 ml-10">
                                                    {selectedInvigilator.totalExams || 0} Assignments
                                                </p>
                                            </div>

                                            {/* Eligibility Status */}
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                                        <UserCheck size={18} className="text-emerald-600" />
                                                    </div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Eligibility</label>
                                                </div>
                                                <div className="ml-10">
                                                    <Chip
                                                        variant="flat"
                                                        className={selectedInvigilator.isEligible ? "bg-emerald-100 text-emerald-700 font-semibold text-sm" : "bg-rose-100 text-rose-700 font-semibold text-sm"}
                                                    >
                                                        {selectedInvigilator.isEligible ? 'Eligible for Duty' : 'Not Eligible'}
                                                    </Chip>
                                                </div>
                                            </div>

                                            {/* Current Status */}
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <Activity size={18} className="text-blue-600" />
                                                    </div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Status</label>
                                                </div>
                                                <div className="ml-10">
                                                    <Chip
                                                        variant="flat"
                                                        className={selectedInvigilator.isOnDuty ? "bg-blue-100 text-blue-700 font-semibold text-sm" : "bg-gray-100 text-gray-700 font-semibold text-sm"}
                                                    >
                                                        {selectedInvigilator.isOnDuty ? 'Currently On Duty' : 'Available'}
                                                    </Chip>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="justify-end gap-3 pb-6 pt-4 px-6 border-t border-gray-200 bg-gray-50">
                                <Button
                                    variant="light"
                                    onPress={onClose}
                                    className="font-semibold text-gray-600 hover:text-gray-900"
                                >
                                    Close
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* View Assignments Modal */}
            <Modal
                isOpen={isAssignmentsOpen}
                onClose={onCloseAssignments}
                size="3xl"
                backdrop="opaque"
                scrollBehavior="inside"
                classNames={{
                    wrapper: "z-[9999]",
                    backdrop: "z-[9998] bg-black/80"
                }}
            >
                <ModalContent className="rounded-3xl bg-white">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 pt-8 px-8 border-b border-gray-100 bg-white">
                                <h2 className="text-xl font-bold text-gray-900">Exam Assignments</h2>
                                <p className="text-sm font-normal text-gray-500">
                                    {selectedInvigilator?.Name} - {selectedInvigilator?.totalExams || 0} total assignments
                                </p>
                            </ModalHeader>
                            <ModalBody className="py-6 px-8 bg-white">
                                <div className="space-y-4">
                                    <div className="text-center py-12 text-gray-400">
                                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-sm font-medium">Assignment details will be displayed here</p>
                                        <p className="text-xs mt-2">This feature requires backend integration</p>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="justify-end gap-3 pb-8 pt-4 px-8 border-t border-gray-100 bg-white">
                                <Button variant="light" onPress={onClose} className="font-bold text-gray-400">Close</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default Invigilators;
