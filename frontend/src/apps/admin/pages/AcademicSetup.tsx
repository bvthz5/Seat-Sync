import React, { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import { toast } from '../../../utils/toast';
import {
    Building2, Layers, Plus, Upload, Download, RefreshCw, Trash2, Edit3,
    X, AlertTriangle, Search, ChevronDown, BookOpen, GraduationCap, FileSpreadsheet, Calendar
} from 'lucide-react';

/* ────────────────────────── types ────────────────────────── */
interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
    programCount?: number;
}

interface Program {
    ProgramID: number;
    ProgramCode: string;
    ProgramName: string;
    DurationYears: number;
    TotalSemesters?: number;
    Departments?: Department[];
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const AcademicSetup: React.FC = () => {
    const [tab, setTab] = useState<'departments' | 'programs'>('departments');

    return (
        <div className="min-h-screen bg-[#f7f8fc]">
            {/* ── Page Header ─────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200">
                            <BookOpen size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Setup</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Manage Departments and Programs</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                            <GraduationCap size={13} /> Academic ERP
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8">
                <div className="max-w-6xl mx-auto flex gap-0">
                    {[
                        { key: 'departments', label: 'Departments', icon: Building2 },
                        { key: 'programs', label: 'Programs', icon: Layers },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key as any)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${tab === key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content ─────────────────────────────────────── */}
            <div className="max-w-6xl mx-auto px-8 py-8">
                {tab === 'departments' && <DepartmentsTab />}
                {tab === 'programs' && <ProgramsTab />}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   DEPARTMENTS TAB
═══════════════════════════════════════════════════════════ */
const DepartmentsTab: React.FC = () => {
    const [depts, setDepts] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const LIMIT = 10;
    const [showAdd, setShowAdd] = useState(false);
    const [showDelete, setShowDelete] = useState<{ mode: 'single' | 'all'; id?: number; name?: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({ DepartmentCode: '', DepartmentName: '' });
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [editForm, setEditForm] = useState({ DepartmentName: '' });
    const [editSaving, setEditSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/departments');
            setDepts(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load departments'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => { setPage(1); }, [search]);

    const filtered = depts.filter(d =>
        d.DepartmentCode.toLowerCase().includes(search.toLowerCase()) ||        
        d.DepartmentName.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / LIMIT);
    const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

    const handleAdd = async () => {
        if (!form.DepartmentCode || !form.DepartmentName) {
            toast.error('Both fields are required'); return;
        }
        setSaving(true);
        try {
            await api.post('/departments', { DepartmentCode: form.DepartmentCode.toLowerCase(), DepartmentName: form.DepartmentName });
            toast.success('Department added');
            setForm({ DepartmentCode: '', DepartmentName: '' });
            setShowAdd(false);
            load();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to add department');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!showDelete) return;
        try {
            if (showDelete.mode === 'single' && showDelete.id) {
                await api.delete(`/departments/${showDelete.id}`);
                toast.success('Department deleted');
            } else {
                await api.delete('/departments/delete-all');
                toast.success('All departments deleted');
            }
            setShowDelete(null);
            load();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Delete failed');
        }
    };

    const openEdit = (dept: Department) => {
        setEditTarget(dept);
        setEditForm({ DepartmentName: dept.DepartmentName });
    };

    const handleEdit = async () => {
        if (!editTarget || !editForm.DepartmentName.trim()) {
            toast.error('Department name is required'); return;
        }
        setEditSaving(true);
        try {
            await api.put(`/departments/${editTarget.DepartmentID}`, { DepartmentName: editForm.DepartmentName.trim() });
            toast.success('Department updated');
            setEditTarget(null);
            load();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to update department');
        } finally { setEditSaving(false); }
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true);
        const fd = new FormData();
        fd.append('file', importFile);
        try {
            const res = await api.post('/departments/import-unified', fd);
            toast.success(`Imported ${res.data.successCount} items${res.data.errorCount > 0 ? `, ${res.data.errorCount} errors` : ''}`);
            load();
            setShowImport(false);
            setImportFile(null);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Import failed');
        } finally {
            setImporting(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const downloadTemplate = async () => {
        try {
            const response = await api.get('/departments/template-unified', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'academic_setup_template.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-5">
                <div className="relative flex-1 max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input id="input-xafreus" name="input-xafreus" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search departments…"
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={load} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all" title="Refresh">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-blue-300 shadow-sm transition-all">
                        <Download size={15} /> Template
                    </button>
                    <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-blue-300 shadow-sm transition-all">
                        <Upload size={15} /> Import
                    </button>
                    <button onClick={() => setShowDelete({ mode: 'all' })} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 shadow-sm transition-all">
                        <Trash2 size={15} /> Delete All
                    </button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all">
                        <Plus size={16} /> Add Department
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Code</th>
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Department Name</th>
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Programs</th>
                            <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">No departments found. Add one to get started.</td></tr>
                        ) : paginated.map(dept => (
                            <tr key={dept.DepartmentID} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold font-mono border border-blue-100">
                                        {dept.DepartmentCode}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{dept.DepartmentName}</td>
                                <td className="px-5 py-3.5">
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                        {dept.programCount ?? 0} program{dept.programCount !== 1 ? 's' : ''}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => openEdit(dept)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            title="Edit"
                                        ><Edit3 size={14} /></button>
                                        <button
                                            onClick={() => setShowDelete({ mode: 'single', id: dept.DepartmentID, name: dept.DepartmentName })}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="Delete"
                                        ><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filtered.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200">
                        <div className="text-xs text-slate-400 font-medium">
                            Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, filtered.length)} of {filtered.length} departments {filtered.length !== depts.length ? `(filtered from ${depts.length})` : ''}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    Previous
                                </button>
                                <span className="px-2 text-xs font-semibold text-slate-500">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAdd && (
                <Modal title="Add Department" onClose={() => setShowAdd(false)}>
                    <div className="space-y-4">
                        <FormField label="Department Code" hint="Format: csa001 (letters + digits)">
                            <input
                                id="dept-code"
                                name="DepartmentCode"
                                value={form.DepartmentCode}
                                onChange={e => setForm(p => ({ ...p, DepartmentCode: e.target.value.toLowerCase() }))}
                                placeholder="e.g. csa001"
                                autoComplete="off"
                                className="input"
                            />
                        </FormField>
                        <FormField label="Department Name">
                            <input
                                id="dept-name"
                                name="DepartmentName"
                                value={form.DepartmentName}
                                onChange={e => setForm(p => ({ ...p, DepartmentName: e.target.value }))}
                                placeholder="e.g. Computer Science and Applications"
                                autoComplete="off"
                                className="input"
                            />
                        </FormField>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
                            <button onClick={handleAdd} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add Department'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit Modal */}
            {editTarget && (
                <Modal title={`Edit: ${editTarget.DepartmentCode}`} onClose={() => setEditTarget(null)}>
                    <div className="space-y-4">
                        <FormField label="Department Code">
                            <input id="edit-dept-code" name="EditDepartmentCode" value={editTarget.DepartmentCode} disabled className="input opacity-60 cursor-not-allowed bg-slate-50" />
                            <p className="text-xs text-slate-400 mt-1">Code cannot be changed after creation.</p>
                        </FormField>
                        <FormField label="Department Name">
                            <input
                                id="edit-dept-name"
                                name="EditDepartmentName"
                                value={editForm.DepartmentName}
                                onChange={e => setEditForm({ DepartmentName: e.target.value })}
                                placeholder="e.g. Computer Science and Applications"
                                autoComplete="off"
                                className="input"
                                autoFocus
                            />
                        </FormField>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditTarget(null)} className="btn-ghost">Cancel</button>
                            <button onClick={handleEdit} disabled={editSaving} className="btn-primary">{editSaving ? 'Saving…' : 'Save Changes'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirm */}
            {showDelete && (
                <ConfirmModal
                    title={showDelete.mode === 'all' ? 'Delete All Departments?' : `Delete "${showDelete.name}"?`}
                    message={showDelete.mode === 'all'
                        ? 'This will remove all departments and their linked programs. This action cannot be undone.'
                        : 'This will remove the department. Programs linked only to this department will also be affected.'}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDelete(null)}
                />
            )}

            {/* Import Modal */}
            {showImport && (
                <Modal title="Import Academic Data" onClose={() => { setShowImport(false); setImportFile(null); }}>
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                            <input 
                                id="import-dept-file"
                                name="ImportDeptFile"
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                onChange={e => setImportFile(e.target.files?.[0] || null)} 
                            />
                            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                <FileSpreadsheet size={32} className={importFile ? "text-blue-500" : "text-slate-400"} />
                                {importFile ? (
                                    <div className="text-sm font-semibold text-slate-700">{importFile.name}</div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold text-slate-700">Click or drag file to this area to upload</div>
                                        <div className="text-xs text-slate-500">Support for a single or bulk upload.</div>
                                    </>
                                )}
                                <div className="text-xs text-slate-400 mt-1">Accepts .csv, .xls, .xlsx</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <button onClick={downloadTemplate} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                Download Template
                            </button>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setShowImport(false); setImportFile(null); }} className="btn-ghost">Cancel</button>
                                <button onClick={handleImport} disabled={importing || !importFile} className="btn-primary">{importing ? 'Importing…' : 'Upload Data'}</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

/* ═══════════════════════════════════════════════════════════
   PROGRAMS TAB
═══════════════════════════════════════════════════════════ */
const ProgramsTab: React.FC = () => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [depts, setDepts] = useState<Department[]>([]);
    const [page, setPage] = useState(1);
    const LIMIT = 10;
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [showDelete, setShowDelete] = useState<{ mode: 'single' | 'all'; id?: number; name?: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({ ProgramCode: '', ProgramName: '', DepartmentIDs: [] as number[], DurationYears: 4 });
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [editTarget, setEditTarget] = useState<Program | null>(null);
    const [editForm, setEditForm] = useState({ ProgramName: '', DepartmentIDs: [] as number[], DurationYears: 4 });
    const [editSaving, setEditSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [pRes, dRes] = await Promise.all([api.get('/programs'), api.get('/departments')]);
            setPrograms(Array.isArray(pRes.data) ? pRes.data : []);
            setDepts(Array.isArray(dRes.data) ? dRes.data : []);
        } catch { toast.error('Failed to load programs'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => { setPage(1); }, [search, filterDept]);

    const filtered = programs.filter(p => {
        const matchSearch = !search || p.ProgramCode.toLowerCase().includes(search.toLowerCase()) || p.ProgramName.toLowerCase().includes(search.toLowerCase());
        const matchDept = !filterDept || p.Departments?.some(d => d.DepartmentID.toString() === filterDept);
        return matchSearch && matchDept;
    });

    const totalPages = Math.ceil(filtered.length / LIMIT);
    const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

    const handleAdd = async () => {
        if (!form.ProgramCode || !form.ProgramName || form.DepartmentIDs.length === 0) {
            toast.error('Program Code, Name, and at least one Department are required'); return;
        }
        setSaving(true);
        try {
            await api.post('/programs', { ...form, DurationYears: Number(form.DurationYears) });
            toast.success('Program created — semesters auto-generated!');
            setForm({ ProgramCode: '', ProgramName: '', DepartmentIDs: [], DurationYears: 4 });
            setShowAdd(false);
            load();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to create program');
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!showDelete) return;
        try {
            if (showDelete.mode === 'single' && showDelete.id) {
                await api.delete(`/programs/${showDelete.id}`);
                toast.success('Program deleted');
            } else {
                await api.delete('/programs/delete-all');
                toast.success('All programs deleted');
            }
            setShowDelete(null);
            load();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Delete failed'); }
    };

    const openEditProg = (prog: Program) => {
        setEditTarget(prog);
        setEditForm({
            ProgramName: prog.ProgramName,
            DepartmentIDs: prog.Departments?.map(d => d.DepartmentID) || [],
            DurationYears: prog.DurationYears
        });
    };

    const handleEditProg = async () => {
        if (!editTarget) return;
        if (!editForm.ProgramName.trim() || editForm.DepartmentIDs.length === 0) {
            toast.error('Name and at least one department are required'); return;
        }
        setEditSaving(true);
        try {
            await api.put(`/programs/${editTarget.ProgramID}`, {
                ProgramName: editForm.ProgramName.trim(),
                DepartmentIDs: editForm.DepartmentIDs,
                DurationYears: Number(editForm.DurationYears)
            });
            toast.success('Program updated');
            setEditTarget(null);
            load();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to update program');
        } finally { setEditSaving(false); }
    };

    const toggleEditDept = (id: number) => {
        setEditForm(prev => ({
            ...prev,
            DepartmentIDs: prev.DepartmentIDs.includes(id)
                ? prev.DepartmentIDs.filter(x => x !== id)
                : [...prev.DepartmentIDs, id]
        }));
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true);
        const fd = new FormData();
        fd.append('file', importFile);
        try {
            const res = await api.post('/departments/import-unified', fd);
            toast.success(`Imported ${res.data.successCount} items${res.data.errorCount > 0 ? `, ${res.data.errorCount} errors` : ''}`);
            if (res.data.errors?.length) console.warn('Import errors:', res.data.errors);
            load();
            setShowImport(false);
            setImportFile(null);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Import failed');
        } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
    };

    const downloadTemplate = async () => {
        try {
            const res = await api.get('/departments/template-unified', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = 'academic_setup_template.csv'; a.click();
        } catch { toast.error('Failed to download template'); }
    };

    const toggleDept = (id: number) => {
        setForm(prev => ({
            ...prev,
            DepartmentIDs: prev.DepartmentIDs.includes(id)
                ? prev.DepartmentIDs.filter(x => x !== id)
                : [...prev.DepartmentIDs, id]
        }));
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-5">
                <div className="flex gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input id="input-56mzqix" name="input-56mzqix" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search programs…"
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        />
                    </div>
                    <select
                        id="filter-dept"
                        name="FilterDepartment"
                        value={filterDept} onChange={e => setFilterDept(e.target.value)}
                        className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    >
                        <option value="">All Departments</option>
                        {depts.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentCode}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={load} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-blue-300 shadow-sm">
                        <Download size={15} /> Template
                    </button>
                    <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-blue-300 shadow-sm">
                        <Upload size={15} /> Import
                    </button>
                    <button onClick={() => setShowDelete({ mode: 'all' })} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 shadow-sm">
                        <Trash2 size={15} /> Delete All
                    </button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-200">
                        <Plus size={16} /> Add Program
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Code</th>
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Program Name</th>
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Departments</th>
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Duration</th>
                            <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Semesters</th>
                            <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-5 py-3.5">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                                {programs.length === 0 ? 'No programs yet. Add one or import from Excel.' : 'No programs match your filters.'}
                            </td></tr>
                        ) : paginated.map(prog => (
                            <tr key={prog.ProgramID} className="hover:bg-slate-50/60 transition-colors group">
                                <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold font-mono border border-indigo-100">
                                        {prog.ProgramCode}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{prog.ProgramName}</td>
                                <td className="px-5 py-3.5">
                                    <div className="flex flex-wrap gap-1">
                                        {prog.Departments?.map(d => (
                                            <span key={d.DepartmentID} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium border border-slate-200">
                                                {d.DepartmentCode}
                                            </span>
                                        )) || <span className="text-slate-400 text-xs">—</span>}
                                    </div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="text-sm text-slate-600 font-medium">{prog.DurationYears} yr{prog.DurationYears !== 1 ? 's' : ''}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                        {prog.TotalSemesters ?? (prog.DurationYears * 2)} sems
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => openEditProg(prog)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            title="Edit"
                                        ><Edit3 size={14} /></button>
                                        <button
                                            onClick={() => setShowDelete({ mode: 'single', id: prog.ProgramID, name: prog.ProgramName })}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="Delete"
                                        ><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filtered.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-200">
                        <div className="text-xs text-slate-400 font-medium">
                            Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, filtered.length)} of {filtered.length} programs {filtered.length !== programs.length ? `(filtered from ${programs.length})` : ''} · Semesters are auto-generated
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    Previous
                                </button>
                                <span className="px-2 text-xs font-semibold text-slate-500">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Program Modal */}
            {showAdd && (
                <Modal title="Add Program" onClose={() => setShowAdd(false)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Program Code">
                                <input id="prog-code" name="ProgramCode" value={form.ProgramCode} onChange={e => setForm(p => ({ ...p, ProgramCode: e.target.value.toUpperCase() }))} placeholder="e.g. BTECH" autoComplete="off" className="input" />
                            </FormField>
                            <FormField label="Duration (Years)" hint="1–5 years → semesters auto-calculated">
                                <select id="prog-duration" name="DurationYears" value={form.DurationYears} onChange={e => setForm(p => ({ ...p, DurationYears: Number(e.target.value) }))} className="input">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <option key={n} value={n}>{n} year{n !== 1 ? 's' : ''} → {n * 2} semesters</option>
                                    ))}
                                </select>
                            </FormField>
                        </div>
                        <FormField label="Program Name">
                            <input id="prog-name" name="ProgramName" value={form.ProgramName} onChange={e => setForm(p => ({ ...p, ProgramName: e.target.value }))} placeholder="e.g. Bachelor of Technology" autoComplete="off" className="input" />
                        </FormField>
                        <FormField label="Departments" hint="Select one or more (e.g. B.Tech links CSE, ME, ECE)">
                            {depts.length === 0 ? (
                                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">No departments found. Add departments first.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 max-h-40 overflow-y-auto">
                                    {depts.map(d => (
                                        <button
                                            key={d.DepartmentID}
                                            type="button"
                                            onClick={() => toggleDept(d.DepartmentID)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${form.DepartmentIDs.includes(d.DepartmentID)
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                            }`}
                                        >
                                            {d.DepartmentCode}
                                            {form.DepartmentIDs.includes(d.DepartmentID) && <X size={10} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {form.DepartmentIDs.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">{form.DepartmentIDs.length} department{form.DepartmentIDs.length !== 1 ? 's' : ''} selected</p>
                            )}
                        </FormField>

                        {form.DurationYears > 0 && (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                                <GraduationCap size={18} className="text-emerald-600 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-emerald-700">{form.DurationYears * 2} Semesters will be auto-generated</p>
                                    <p className="text-xs text-emerald-600">Semester 1 through {form.DurationYears * 2} will be created automatically.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
                            <button onClick={handleAdd} disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Program'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {showDelete && (
                <ConfirmModal
                    title={showDelete.mode === 'all' ? 'Delete All Programs?' : `Delete "${showDelete.name}"?`}
                    message={showDelete.mode === 'all' ? 'This will remove all programs and their auto-generated semesters.' : 'This program and its semesters will be deleted permanently.'}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDelete(null)}
                />
            )}

            {/* Edit Program Modal */}
            {editTarget && (
                <Modal title={`Edit: ${editTarget.ProgramCode}`} onClose={() => setEditTarget(null)}>
                    <div className="space-y-4">
                        <FormField label="Program Code">
                            <input id="edit-prog-code" name="EditProgramCode" value={editTarget.ProgramCode} disabled className="input opacity-60 cursor-not-allowed bg-slate-50" />
                            <p className="text-xs text-slate-400 mt-1">Code cannot be changed after creation.</p>
                        </FormField>
                        <FormField label="Program Name">
                            <input
                                id="edit-prog-name"
                                name="EditProgramName"
                                value={editForm.ProgramName}
                                onChange={e => setEditForm(p => ({ ...p, ProgramName: e.target.value }))}
                                placeholder="e.g. Bachelor of Technology"
                                autoComplete="off"
                                className="input"
                                autoFocus
                            />
                        </FormField>
                        <FormField label="Duration (Years)" hint={`Currently ${editForm.DurationYears} yr(s) → ${editForm.DurationYears * 2} semesters`}>
                            <select
                                id="edit-prog-duration"
                                name="EditDurationYears"
                                value={editForm.DurationYears}
                                onChange={e => setEditForm(p => ({ ...p, DurationYears: Number(e.target.value) }))}
                                className="input"
                            >
                                {[1, 2, 3, 4, 5].map(n => (
                                    <option key={n} value={n}>{n} year{n !== 1 ? 's' : ''} → {n * 2} semesters</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="Departments" hint="Toggle to add / remove departments">
                            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 max-h-40 overflow-y-auto">
                                {depts.map(d => (
                                    <button
                                        key={d.DepartmentID}
                                        type="button"
                                        onClick={() => toggleEditDept(d.DepartmentID)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${editForm.DepartmentIDs.includes(d.DepartmentID)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                        }`}
                                    >
                                        {d.DepartmentCode}
                                        {editForm.DepartmentIDs.includes(d.DepartmentID) && <X size={10} />}
                                    </button>
                                ))}
                            </div>
                            {editForm.DepartmentIDs.length > 0 && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">{editForm.DepartmentIDs.length} department{editForm.DepartmentIDs.length !== 1 ? 's' : ''} selected</p>
                            )}
                        </FormField>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setEditTarget(null)} className="btn-ghost">Cancel</button>
                            <button onClick={handleEditProg} disabled={editSaving} className="btn-primary">{editSaving ? 'Saving…' : 'Save Changes'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Import Program Modal */}
            {showImport && (
                <Modal title="Import Academic Data" onClose={() => { setShowImport(false); setImportFile(null); }}>
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                            <input 
                                id="import-prog-file"
                                name="ImportProgFile"
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                onChange={e => setImportFile(e.target.files?.[0] || null)} 
                            />
                            <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                                <FileSpreadsheet size={32} className={importFile ? "text-blue-500" : "text-slate-400"} />
                                {importFile ? (
                                    <div className="text-sm font-semibold text-slate-700">{importFile.name}</div>
                                ) : (
                                    <>
                                        <div className="text-sm font-semibold text-slate-700">Click or drag file to this area to upload</div>
                                        <div className="text-xs text-slate-500">Support for a single or bulk upload.</div>
                                    </>
                                )}
                                <div className="text-xs text-slate-400 mt-1">Accepts .csv, .xls, .xlsx</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <button onClick={downloadTemplate} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                Download Template
                            </button>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setShowImport(false); setImportFile(null); }} className="btn-ghost">Cancel</button>
                                <button onClick={handleImport} disabled={importing || !importFile} className="btn-primary">{importing ? 'Importing…' : 'Upload Data'}</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════════════ */
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">{title}</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                    <X size={18} />
                </button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    </div>
);

const ConfirmModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{message}</p>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="btn-ghost">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all">Delete</button>
            </div>
        </div>
    </div>
);

const FormField: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div>
        <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
        {children}
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
);

export default AcademicSetup;
