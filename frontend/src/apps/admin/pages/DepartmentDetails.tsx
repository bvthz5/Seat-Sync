import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip, Avatar, Pagination, Input, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem } from '@heroui/react';
import {
    Download,
    Plus,
    Hash,
    BookOpen,
    User,
    Users,
    MoreVertical,
    Search,
    Crown,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    FileText,
    Upload,
    AlertCircle,
    Image as ImageIcon,
    X
} from 'lucide-react';
import { motion } from 'framer-motion';

const DepartmentDetails: React.FC = () => {
    const { id } = useParams();
    const [department, setDepartment] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();

    const [newFaculty, setNewFaculty] = useState({
        Name: "",
        Designation: "",
        ProfileImageURL: "",
        isEligible: true
    });
    const [editingFaculty, setEditingFaculty] = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditOpen = (faculty: any) => {
        setEditingFaculty({ ...faculty });
        setEditImagePreview(faculty.ProfileImageURL);
        setEditSelectedImage(null);
        onEditOpen();
    };

    const handleUpdateFaculty = async () => {
        try {
            setSubmitting(true);

            let imageUrl = editingFaculty.ProfileImageURL;
            if (editSelectedImage) {
                const formData = new FormData();
                formData.append('image', editSelectedImage);
                const uploadRes = await api.post('/faculties/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                imageUrl = uploadRes.data.imageUrl;
            }

            const payload = {
                Name: editingFaculty.Name,
                Designation: editingFaculty.Designation,
                ProfileImageURL: imageUrl,
                isEligible: editingFaculty.isEligible
            };

            await api.put(`/faculties/${editingFaculty.FacultyID}`, payload);

            // Refresh list
            const response = await api.get(`/departments/${id}`);
            setDepartment(response.data);
            onEditClose();
            setEditingFaculty(null);
            setEditSelectedImage(null);
            setEditImagePreview(null);
        } catch (err: any) {
            console.error(err);
            alert("Failed to update faculty: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddFaculty = async () => {
        try {
            setSubmitting(true);

            let imageUrl = "";
            if (selectedImage) {
                const formData = new FormData();
                formData.append('image', selectedImage);
                const uploadRes = await api.post('/faculties/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                imageUrl = uploadRes.data.imageUrl;
            }

            const payload = {
                ...newFaculty,
                ProfileImageURL: imageUrl,
                DepartmentID: id
            };
            await api.post('/faculties', payload);
            // Refresh list
            const response = await api.get(`/departments/${id}`);
            setDepartment(response.data);
            onAddClose();
            setNewFaculty({ Name: "", Designation: "", ProfileImageURL: "", isEligible: true });
            setSelectedImage(null);
            setImagePreview(null);
        } catch (err: any) {
            console.error(err);
            alert("Failed to add faculty: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubmitting(true);
        const fileName = file.name.toLowerCase();

        try {
            let data: any[] = [];

            if (fileName.endsWith('.csv')) {
                data = await new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => resolve(results.data),
                        error: (error) => reject(error)
                    });
                });
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(sheet);
            }

            // Map and validate
            const facultiesToImport = data.map((item: any) => ({
                Name: item.Name || item.name || item.FacultyName,
                Designation: item.Designation || item.designation || "Faculty",
                ProfileImageURL: item.ProfileImageURL || item.image || item.ImageURL || "",
                DepartmentID: id,
                isEligible: true
            })).filter(f => f.Name);

            if (facultiesToImport.length === 0) {
                alert("No valid faculty data found in file.");
                return;
            }

            await api.post('/faculties/import', { faculties: facultiesToImport });

            // Refresh list
            const response = await api.get(`/departments/${id}`);
            setDepartment(response.data);
            alert(`Successfully imported ${facultiesToImport.length} faculties!`);
        } catch (err: any) {
            console.error(err);
            alert("Import failed: " + err.message);
        } finally {
            setSubmitting(false);
            e.target.value = ""; // Clear input
        }
    };

    useEffect(() => {
        const fetchDepartment = async () => {
            try {
                // Use centralized API instance to handle auth token automatically
                const response = await api.get(`/departments/${id}`);
                setDepartment(response.data);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load department');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDepartment();
        }
    }, [id]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
    if (!department) return <div className="p-8">Department not found</div>;

    const faculties = department.Faculties || [];

    // Find HOD
    const hod = faculties.find((f: any) =>
        f.Designation.toLowerCase().includes('head') ||
        f.Designation.toLowerCase().includes('hod')
    );
    const hodName = hod ? hod.Name : "N/A";

    // Stats
    const hodIcon = hod && hod.ProfileImageURL ? (
        <img
            src={hod.ProfileImageURL}
            alt={hod.Name}
            className="w-full h-full object-cover rounded-xl"
            onError={(e) => {
                e.currentTarget.style.display = 'none'; // Fallback to icon if this fails (would need more complex logic to show icon, but for now just hide broken img)
                // Actually, if I hide it, the container is empty. 
                // Better: e.currentTarget.parentElement.innerHTML = ... but that's messy in React.
                // Simple fallback: reset src to UI Shield or generic
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hod.Name)}&background=10b981&color=ffffff`;
            }}
        />
    ) : <User className="text-green-500" />;

    const stats = [
        { label: "DEPT CODE", value: department.DepartmentCode, icon: <Hash className="text-blue-500" />, color: "bg-blue-50" },
        { label: "DEPT NAME", value: department.DepartmentName, icon: <BookOpen className="text-purple-500" />, color: "bg-purple-50" },
        { label: "HEAD (HOD)", value: hodName, icon: hodIcon, color: hod && hod.ProfileImageURL ? "bg-transparent p-0" : "bg-green-50" }, // Remove padding/bg if image
        { label: "TOTAL STUDENTS", value: "0", icon: <Users className="text-orange-500" />, color: "bg-orange-50" },
        { label: "TOTAL FACULTY", value: faculties.length.toString(), icon: <Hash className="text-pink-500" />, color: "bg-pink-50" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <motion.div
            className="p-8 max-w-[1600px] mx-auto space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{department.DepartmentName}</h1>
                    <p className="text-slate-500 mt-2 text-base font-medium">Manage core department metrics and faculty staff.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="bordered"
                        startContent={<Upload size={18} />}
                        className="font-bold border-slate-300 text-slate-700 bg-white"
                        onPress={() => document.getElementById('import-input')?.click()}
                        isLoading={submitting}
                    >
                        Import
                    </Button>
                    <input
                        id="import-input"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={handleImport}
                    />
                    <Button
                        color="primary"
                        startContent={<Plus size={18} />}
                        className="font-bold bg-blue-600 shadow-md shadow-blue-500/20"
                        onPress={onAddOpen}
                    >
                        Add faculty
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardBody className="p-6 h-full flex flex-col justify-between min-h-[140px]">
                            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-extrabold text-slate-800 leading-tight">{stat.value}</h3>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Faculty Table Section */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardBody className="p-0">
                    {/* Table Header / Toolbar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-xl font-bold text-slate-800">Faculties in this Department</h3>
                        <div className="flex items-center gap-2">
                            <Button isIconOnly variant="light" size="sm" className="text-slate-400">
                                <MoreVertical size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faculties.map((faculty: any) => {
                                    const isHod = hod && hod.FacultyID === faculty.FacultyID;
                                    return (
                                        <tr key={faculty.FacultyID} className={`border-b border-slate-50 transition-colors group ${isHod ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50/50'}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 min-w-[40px] rounded-full overflow-hidden bg-slate-200 ring-2 ring-white shadow-sm hover:shadow-md transition-shadow">
                                                        <img
                                                            src={faculty.ProfileImageURL}
                                                            alt={faculty.Name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.Name)}&background=f1f5f9&color=64748b&bold=true`;
                                                            }}
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                    <div className="ml-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-slate-800">{faculty.Name}</p>
                                                            {isHod && (
                                                                <Chip
                                                                    size="sm"
                                                                    variant="flat"
                                                                    className="h-5 bg-amber-100 text-amber-700 font-bold border border-amber-200"
                                                                    startContent={<Crown size={10} className="ml-1 text-amber-600" fill="currentColor" />}
                                                                >
                                                                    <span className="text-[10px] uppercase tracking-wide pr-1">Head of Dept</span>
                                                                </Chip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">{faculty.Designation}</td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${faculty.isEligible
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${faculty.isEligible ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                    {faculty.isEligible ? 'Eligible' : 'Ineligible'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Dropdown placement="bottom-end">
                                                    <DropdownTrigger>
                                                        <Button
                                                            size="sm"
                                                            className="bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                                                        >
                                                            Manage
                                                        </Button>
                                                    </DropdownTrigger>
                                                    <DropdownMenu
                                                        aria-label="Faculty Actions"
                                                        className="bg-white border border-slate-100 shadow-xl rounded-xl"
                                                        variant="flat"
                                                    >
                                                        <DropdownSection showDivider>
                                                            <DropdownItem
                                                                key="edit"
                                                                startContent={<Edit size={16} className="text-blue-500" />}
                                                                onPress={() => handleEditOpen(faculty)}
                                                            >
                                                                Edit Profile
                                                            </DropdownItem>
                                                            <DropdownItem
                                                                key="toggle"
                                                                startContent={faculty.isEligible ? <XCircle size={16} className="text-slate-400" /> : <CheckCircle size={16} className="text-green-500" />}
                                                                className={faculty.isEligible ? "text-slate-600" : "text-green-600"}
                                                                onPress={async () => {
                                                                    try {
                                                                        await api.put(`/faculties/${faculty.FacultyID}`, { isEligible: !faculty.isEligible });
                                                                        const updatedFaculties = faculties.map((f: any) =>
                                                                            f.FacultyID === faculty.FacultyID ? { ...f, isEligible: !f.isEligible } : f
                                                                        );
                                                                        setDepartment({ ...department, Faculties: updatedFaculties });
                                                                    } catch (e) {
                                                                        console.error("Failed to toggle eligibility", e);
                                                                        alert("Failed to update status");
                                                                    }
                                                                }}
                                                            >
                                                                {faculty.isEligible ? "Mark as Ineligible" : "Mark as Eligible"}
                                                            </DropdownItem>
                                                        </DropdownSection>

                                                        <DropdownSection>
                                                            <DropdownItem
                                                                key="delete"
                                                                className="text-red-600"
                                                                color="danger"
                                                                startContent={<Trash2 size={16} className="text-red-500" />}
                                                                onPress={async () => {
                                                                    if (confirm(`Are you sure you want to remove ${faculty.Name}?`)) {
                                                                        try {
                                                                            await api.delete(`/faculties/${faculty.FacultyID}`);
                                                                            const updatedFaculties = faculties.filter((f: any) => f.FacultyID !== faculty.FacultyID);
                                                                            setDepartment({ ...department, Faculties: updatedFaculties });
                                                                        } catch (e) {
                                                                            console.error("Failed to delete faculty", e);
                                                                            alert("Failed to delete faculty");
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                Delete Faculty
                                                            </DropdownItem>
                                                        </DropdownSection>
                                                    </DropdownMenu>
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {faculties.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">No faculty members found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>
            {/* Add Faculty Modal */}
            <Modal
                isOpen={isAddOpen}
                onClose={onAddClose}
                size="2xl"
                backdrop="blur"
                classNames={{
                    backdrop: "bg-slate-900/50 backdrop-blur-md"
                }}
            >
                <ModalContent className="bg-white">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-2xl font-bold text-slate-800">Add New Faculty</h2>
                                <p className="text-sm text-slate-500">Enter faculty details to register them in this department.</p>
                            </ModalHeader>
                            <ModalBody className="py-6 bg-white">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                            <Input
                                                placeholder="e.g. Dr. Jane Smith"
                                                value={newFaculty.Name}
                                                onChange={(e) => setNewFaculty({ ...newFaculty, Name: e.target.value })}
                                                variant="bordered"
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Designation</label>
                                            <Input
                                                placeholder="e.g. Associate Professor"
                                                value={newFaculty.Designation}
                                                onChange={(e) => setNewFaculty({ ...newFaculty, Designation: e.target.value })}
                                                variant="bordered"
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Profile Image</label>
                                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 transition-all hover:border-blue-400 group relative bg-white overflow-hidden">
                                            {imagePreview ? (
                                                <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden shadow-lg">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <Button
                                                        isIconOnly
                                                        size="sm"
                                                        variant="flat"
                                                        className="absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white hover:bg-red-500 rounded-full"
                                                        onPress={() => {
                                                            setSelectedImage(null);
                                                            setImagePreview(null);
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex flex-col items-center cursor-pointer py-4 w-full"
                                                    onClick={() => document.getElementById('faculty-image-upload')?.click()}
                                                >
                                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                        <ImageIcon size={32} />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800">Upload Image</p>
                                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG or WebP up to 5MB</p>
                                                </div>
                                            )}
                                            <input
                                                id="faculty-image-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="text-blue-500 mt-0.5" size={20} />
                                        <p className="text-sm text-blue-800 leading-relaxed font-semibold">
                                            The new faculty will be marked as <strong>Eligible</strong> by default. You can change this later in the management menu.
                                        </p>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-slate-100">
                                <Button variant="light" onPress={onClose} className="font-bold">
                                    Cancel
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleAddFaculty}
                                    className="font-bold bg-blue-600"
                                    isLoading={submitting}
                                >
                                    Confirm Addition
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Edit Faculty Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={onEditClose}
                size="2xl"
                backdrop="blur"
                classNames={{
                    backdrop: "bg-slate-900/50 backdrop-blur-md"
                }}
            >
                <ModalContent className="bg-white">
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-2xl font-bold text-slate-800">Edit Faculty Profile</h2>
                                <p className="text-sm text-slate-500">Update the details for {editingFaculty?.Name}</p>
                            </ModalHeader>
                            <ModalBody className="py-6 bg-white">
                                {editingFaculty && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                                <Input
                                                    placeholder="e.g. Dr. Jane Smith"
                                                    value={editingFaculty.Name}
                                                    onChange={(e) => setEditingFaculty({ ...editingFaculty, Name: e.target.value })}
                                                    variant="bordered"
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-bold text-slate-700 ml-1">Designation</label>
                                                <Input
                                                    placeholder="e.g. Associate Professor"
                                                    value={editingFaculty.Designation}
                                                    onChange={(e) => setEditingFaculty({ ...editingFaculty, Designation: e.target.value })}
                                                    variant="bordered"
                                                    className="bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Profile Image</label>
                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 transition-all hover:border-blue-400 group relative bg-white overflow-hidden">
                                                {editImagePreview ? (
                                                    <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden shadow-lg">
                                                        <img
                                                            src={editImagePreview}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="flat"
                                                            className="absolute top-2 right-2 bg-white/20 backdrop-blur-md text-white hover:bg-red-500 rounded-full"
                                                            onPress={() => {
                                                                setEditSelectedImage(null);
                                                                setEditImagePreview(null);
                                                            }}
                                                        >
                                                            <X size={14} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="flex flex-col items-center cursor-pointer py-4 w-full"
                                                        onClick={() => document.getElementById('edit-faculty-image-upload')?.click()}
                                                    >
                                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                            <ImageIcon size={32} />
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-800">Change Image</p>
                                                        <p className="text-xs text-slate-500 mt-1">PNG, JPG or WebP up to 5MB</p>
                                                    </div>
                                                )}
                                                <input
                                                    id="edit-faculty-image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleEditFileChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="text-blue-500 mt-0.5" size={20} />
                                            <p className="text-sm text-blue-800 leading-relaxed font-semibold">
                                                Updating the profile will keep the faculty's eligibility status unchanged unless manually toggled.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="border-t border-slate-100">
                                <Button variant="light" onPress={onClose} className="font-bold">
                                    Cancel
                                </Button>
                                <Button
                                    color="primary"
                                    onPress={handleUpdateFaculty}
                                    className="font-bold bg-blue-600"
                                    isLoading={submitting}
                                >
                                    Save Changes
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </motion.div>
    );
};

export default DepartmentDetails;
