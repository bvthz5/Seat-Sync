import React, { useState, useCallback, useRef } from 'react';
import {
    Modal,
    ModalContent,
    Button,
} from '@heroui/react';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    X,
    Download,
    Info,
    ChevronRight,
    RotateCcw,
    ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { invigilatorService, BulkImportRow } from '../../services/invigilatorService';

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; }
type Step = 'instructions' | 'upload' | 'preview' | 'result';
interface ImportResult { message: string; created: number; skipped: { row: number; reason: string }[]; }

const STEPS: { key: Step; label: string }[] = [
    { key: 'instructions', label: 'Guide' },
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'result', label: 'Done' },
];
const stepIdx = (s: Step) => STEPS.findIndex(x => x.key === s);

const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
        ['FacultyID', 'Name', 'Department', 'Designation'],
        ['101', 'Dr. Sarah Johnson', 'CS', 'Professor'],
        ['102', 'Mr. Alan Walker', 'ECE', 'Asst. Professor'],
        ['103', 'Ms. Priya Nair', 'ME', 'Senior Lecturer'],
    ]);
    ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invigilators');
    XLSX.writeFile(wb, 'invigilator_import_template.xlsx');
};

const BulkImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<Step>('instructions');
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [rows, setRows] = useState<BulkImportRow[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStep('instructions'); setIsDragging(false);
        setFile(null); setRows([]); setParseErrors([]);
        setIsImporting(false); setResult(null);
    };
    const handleClose = () => { reset(); onClose(); };

    const parseFile = (f: File) => {
        setFile(f);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
                if (raw.length === 0) { setParseErrors(['The spreadsheet is empty.']); return; }
                const normalised: BulkImportRow[] = [];
                const errors: string[] = [];
                raw.forEach((r, i) => {
                    const t: Record<string, any> = {};
                    Object.keys(r).forEach(k => { t[k.trim()] = typeof r[k] === 'string' ? r[k].trim() : r[k]; });
                    if (!t['Name'] && !t['Department']) return;
                    const fid = t['FacultyID'] || t['Faculty ID'] || t['faculty_id'];
                    if (!fid) { errors.push(`Row ${i + 2}: Missing FacultyID.`); return; }
                    if (!t['Name']) { errors.push(`Row ${i + 2}: Missing Name.`); return; }
                    if (!t['Department']) { errors.push(`Row ${i + 2}: Missing Department.`); return; }
                    normalised.push({ FacultyID: fid, Name: t['Name'], Department: t['Department'], Designation: t['Designation'] || undefined });
                });
                setRows(normalised); setParseErrors(errors); setStep('preview');
            } catch { toast.error('Could not parse the file. Please use .xlsx or .csv.'); }
        };
        reader.readAsArrayBuffer(f);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) parseFile(f);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = '';
    };

    const handleImport = async () => {
        if (!rows.length) return; setIsImporting(true);
        try {
            const res = await invigilatorService.bulkImport(rows);
            setResult(res); setStep('result');
            if (res.created > 0) onSuccess();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Import failed. Please try again.');
        } finally { setIsImporting(false); }
    };

    const cur = stepIdx(step);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="2xl"
            backdrop="opaque"
            scrollBehavior="normal"
            placement="center"
            classNames={{
                wrapper: 'z-[9999] items-center',
                backdrop: 'z-[9998] bg-black/50 backdrop-blur-sm',
                base: 'shadow-2xl my-auto',
            }}
        >
            <ModalContent className="rounded-2xl overflow-hidden bg-white border border-slate-200">
                {() => (
                    <div className="flex flex-col">

                        {/* ── Compact top bar ─────────────────────── */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet size={15} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 leading-tight">Bulk Import Invigilators</p>
                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Upload a spreadsheet to import multiple staff records</p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        {/* ── Step pills ──────────────────────────── */}
                        <div className="flex items-center gap-0 border-b border-slate-100">
                            {STEPS.map((s, i) => {
                                const done = cur > i, current = cur === i;
                                return (
                                    <React.Fragment key={s.key}>
                                        <div className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all ${current ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${current ? 'bg-blue-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                {done ? '✓' : i + 1}
                                            </div>
                                            {s.label}
                                        </div>
                                        {i < STEPS.length - 1 && <div className="w-px h-4 bg-slate-200" />}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* ── Body ────────────────────────────────── */}
                        <div className="px-5 py-4 space-y-3">

                            {/* STEP 1: Instructions */}
                            {step === 'instructions' && (
                                <>
                                    <div className="flex gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-800 leading-relaxed">Prepare an Excel (.xlsx) or CSV file with the columns below. Download the template to get started instantly.</p>
                                    </div>

                                    {/* Column reference table */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                        <div className="grid grid-cols-[100px_80px_1fr] bg-slate-800 px-3 py-2 gap-3">
                                            {['Column', 'Required', 'Notes'].map(h => (
                                                <span key={h} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
                                            ))}
                                        </div>
                                        {[
                                            { col: 'FacultyID', req: true, note: 'Unique numeric ID. Duplicate IDs are skipped.' },
                                            { col: 'Name', req: true, note: 'Full name of the staff member.' },
                                            { col: 'Department', req: true, note: 'Department code (CS, ECE) or full name.' },
                                            { col: 'Designation', req: false, note: 'e.g. Professor. Defaults to "Faculty".' },
                                        ].map(({ col, req, note }, i, arr) => (
                                            <div key={col} className={`grid grid-cols-[100px_80px_1fr] px-3 py-2.5 gap-3 items-center bg-white ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                                <span className="font-mono font-bold text-slate-800">{col}</span>
                                                <span className={`font-semibold ${req ? 'text-rose-500' : 'text-slate-400'}`}>{req ? '✦ Required' : 'Optional'}</span>
                                                <span className="text-slate-500">{note}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <Info size={13} className="text-slate-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Any department name or code provided in the file will be saved exactly as entered.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* STEP 2: Upload */}
                            {step === 'upload' && (
                                <div className="space-y-3">
                                    <div
                                        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center text-center cursor-pointer transition-all ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                            <Upload size={22} className={isDragging ? 'text-blue-500' : 'text-slate-400'} />
                                        </div>
                                        <p className="font-bold text-slate-800 text-sm mb-1">{isDragging ? 'Release to upload' : 'Drop your file here'}</p>
                                        <p className="text-xs text-slate-400 mb-4">or click to browse</p>
                                        <div className="flex gap-1.5">
                                            {['.xlsx', '.xls', '.csv'].map(ext => (
                                                <span key={ext} className="bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-500">{ext}</span>
                                            ))}
                                        </div>
                                        <input type="file" accept=".xlsx,.xls,.csv" ref={fileRef} className="hidden" onChange={handleFileInput} />
                                    </div>
                                    {parseErrors.length > 0 && (
                                        <div className="border border-rose-200 rounded-xl p-3 bg-rose-50">
                                            <p className="text-xs font-bold text-rose-700 mb-1.5 flex items-center gap-1"><AlertTriangle size={12} /> Issues found:</p>
                                            <ul className="space-y-1">{parseErrors.map((e, i) => <li key={i} className="text-xs text-rose-600">• {e}</li>)}</ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: Preview */}
                            {step === 'preview' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet size={14} className="text-slate-500" />
                                            <p className="text-xs font-semibold text-slate-700">{file?.name}</p>
                                            <span className="text-xs text-slate-400">— {rows.length} rows</span>
                                        </div>
                                        <button onClick={() => setStep('upload')} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
                                            <RotateCcw size={11} /> Change
                                        </button>
                                    </div>

                                    {parseErrors.length > 0 && (
                                        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                                            <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1"><AlertTriangle size={12} /> {parseErrors.length} row(s) skipped</p>
                                            <ul className="space-y-0.5">{parseErrors.map((e, i) => <li key={i} className="text-xs text-amber-700">• {e}</li>)}</ul>
                                        </div>
                                    )}

                                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                        <div className="grid grid-cols-[70px_1.6fr_1fr_1fr] bg-slate-800 px-4 py-2 gap-3">
                                            {['ID', 'Name', 'Dept', 'Designation'].map(h => (
                                                <span key={h} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
                                            ))}
                                        </div>
                                        <div className="max-h-40 overflow-y-auto">
                                            {rows.length === 0
                                                ? <div className="py-6 text-center text-xs text-slate-400">No valid rows</div>
                                                : rows.map((row, i) => (
                                                    <div key={i} className={`grid grid-cols-[70px_1.6fr_1fr_1fr] px-4 py-2 gap-3 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                                        <span className="font-mono text-slate-400">{row.FacultyID}</span>
                                                        <span className="font-semibold text-slate-800 truncate">{row.Name}</span>
                                                        <span className="text-slate-600 truncate">{row.Department}</span>
                                                        <span className="text-slate-500 truncate">{row.Designation || <em className="text-slate-300">Faculty</em>}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Result */}
                            {step === 'result' && result && (
                                <div className="space-y-3">
                                    <div className={`rounded-xl p-5 text-center border ${result.created > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${result.created > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                                            <CheckCircle2 size={22} className="text-white" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 mb-1">Import Complete</h3>
                                        <p className="text-xs text-slate-500 mb-4">{result.message}</p>
                                        <div className="flex justify-center gap-8">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Imported</p>
                                            </div>
                                            <div className="w-px bg-slate-200" />
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-amber-500">{result.skipped.length}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Skipped</p>
                                            </div>
                                        </div>
                                    </div>
                                    {result.skipped.length > 0 && (
                                        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                                            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Skipped rows:</p>
                                            {result.skipped.map((s, i) => (
                                                <div key={i} className="flex gap-1.5 text-xs text-amber-700 mb-1">
                                                    <span className="font-bold shrink-0">Row {s.row}</span>
                                                    <span>— {s.reason}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Footer ──────────────────────────────── */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                            {step !== 'result'
                                ? <Button size="sm" variant="light" className="text-slate-500 text-xs font-semibold h-8 rounded-lg px-3" startContent={<Download size={12} />} onPress={downloadTemplate}>Template</Button>
                                : <Button size="sm" variant="light" className="text-slate-500 text-xs font-semibold h-8 rounded-lg px-3" startContent={<RotateCcw size={12} />} onPress={reset}>Import Another</Button>
                            }

                            <div className="flex items-center gap-2">
                                {step === 'instructions' && (
                                    <>
                                        <Button size="sm" variant="bordered" className="border-slate-200 text-slate-600 font-semibold h-8 rounded-lg text-xs" onPress={handleClose}>Cancel</Button>
                                        <Button size="sm" className="bg-blue-600 text-white font-semibold h-8 rounded-lg px-4 text-xs" onPress={() => setStep('upload')} endContent={<ChevronRight size={13} />}>Continue</Button>
                                    </>
                                )}
                                {step === 'upload' && (
                                    <>
                                        <Button size="sm" variant="bordered" className="border-slate-200 text-slate-600 font-semibold h-8 rounded-lg text-xs" onPress={() => setStep('instructions')} startContent={<ArrowLeft size={12} />}>Back</Button>
                                        <Button size="sm" variant="bordered" className="border-slate-200 text-slate-600 font-semibold h-8 rounded-lg text-xs" onPress={handleClose}>Cancel</Button>
                                    </>
                                )}
                                {step === 'preview' && (
                                    <>
                                        <Button size="sm" variant="bordered" className="border-slate-200 text-slate-600 font-semibold h-8 rounded-lg text-xs" onPress={() => setStep('upload')} startContent={<ArrowLeft size={12} />}>Back</Button>
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 rounded-lg px-4 text-xs"
                                            isDisabled={rows.length === 0}
                                            isLoading={isImporting}
                                            onPress={handleImport}
                                            startContent={!isImporting ? <Upload size={12} /> : undefined}
                                        >
                                            Import {rows.length} Record{rows.length !== 1 ? 's' : ''}
                                        </Button>
                                    </>
                                )}
                                {step === 'result' && (
                                    <Button size="sm" className="bg-slate-900 text-white font-semibold h-8 rounded-lg px-5 text-xs" onPress={handleClose}>Done</Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </ModalContent>
        </Modal>
    );
};

export default BulkImportModal;
