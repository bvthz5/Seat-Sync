import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, ScrollShadow } from '@heroui/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExamImportPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmImport: () => void;
    data: any;
    headers: string[];
    isImporting?: boolean;
}

const ExamImportPreview = ({
    isOpen,
    onClose,
    onConfirmImport,
    data,
    headers,
    isImporting = false
}: ExamImportPreviewProps) => {
    const previewRows = Array.isArray(data.data) ? data.data : [];
    const successCount = data.successCount || previewRows.length;
    const errorCount = data.errorCount || 0;
    const errors = data.errors || [];
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onClose}
            size="4xl"
            backdrop="blur"
            scrollBehavior="inside"
            classNames={{
                wrapper: "z-[999]",
                backdrop: "z-[998] bg-black/50",
                base: "bg-white"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 border-b pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <CheckCircle2 className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <span className="text-xl font-bold text-slate-900">Timetable Preview</span>
                                    <p className="text-sm text-slate-500">Review the parsed timetable data</p>
                                </div>
                            </div>
                        </ModalHeader>
                        <ModalBody className="py-6">
                            <div className="space-y-4">
                                {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                        <div className="text-sm text-emerald-600 font-semibold">Rows Found</div>
                                        <div className="text-3xl font-bold text-emerald-700 mt-1">{successCount}</div>
                                    </div>
                                    <div className={`rounded-lg p-4 border ${errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className={`text-sm font-semibold ${errorCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>Errors</div>
                                        <div className={`text-3xl font-bold mt-1 ${errorCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>{errorCount}</div>
                                    </div>
                                </div>

                                {/* Errors Display */}
                                {errorCount > 0 && errors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex gap-2 mb-2">
                                            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                                            <div>
                                                <p className="font-semibold text-red-900">Import Errors</p>
                                                <p className="text-sm text-red-700 mt-1">
                                                    {errors.slice(0, 3).map((e, i) => (
                                                        <div key={i}>{e}</div>
                                                    ))}
                                                </p>
                                                {errors.length > 3 && <p className="text-sm text-red-600 mt-1">... and {errors.length - 3} more</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Data Preview Table */}
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <ScrollShadow className="w-full h-[400px]">
                                        <Table
                                            aria-label="Timetable data preview"
                                            classNames={{
                                                wrapper: "bg-white",
                                                table: "text-sm",
                                                thead: "[&>tr]:first:bg-slate-50",
                                                th: "bg-slate-50 font-semibold text-slate-900 border-b border-slate-200",
                                                td: "border-b border-slate-100 py-2 px-3",
                                            }}
                                        >
                                            <TableHeader>
                                                {headers.map((col) => (
                                                    <TableColumn key={col} className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                        {col}
                                                    </TableColumn>
                                                ))}
                                            </TableHeader>
                                            <TableBody>
                                                {previewRows.slice(0, 50).map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        {headers.map((col) => (
                                                            <TableCell key={`${idx}-${col}`} className="text-slate-700 text-xs">
                                                                {typeof row[col] === 'string' && row[col].length > 50 ? `${row[col].substring(0, 50)}...` : String(row[col] || '')}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollShadow>
                                </div>

                                {previewRows.length > 50 && (
                                    <p className="text-xs text-slate-500 text-center">Showing first 50 of {previewRows.length} rows</p>
                                )}
                            </div>
                        </ModalBody>
                        <ModalFooter className="border-t pt-4">
                            <Button variant="light" onPress={onClose} isDisabled={isImporting}>
                                Cancel
                            </Button>
                            <Button
                                color={errorCount > 0 ? "warning" : "success"}
                                onPress={onConfirmImport}
                                isLoading={isImporting}
                                isDisabled={isImporting || previewRows.length === 0}
                            >
                                {isImporting ? 'Importing...' : `Confirm & Import (${successCount} exams)`}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default ExamImportPreview;
