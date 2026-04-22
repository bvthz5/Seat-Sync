import React, { useState } from 'react';
import {
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Input, Select, SelectItem,
    Card, Chip, Skeleton, Alert
} from '@heroui/react';
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SeatingService } from '../../services/seatingService';

interface PriorityAssignModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAssignSuccess?: () => void;
}

interface StudentInfo {
    StudentID: number;
    RegisterNumber: string;
    FullName: string;
    Email: string;
    Department: string;
    DepartmentName: string;
}

interface RoomInfo {
    RoomID: number;
    RoomCode: string;
    FloorID: number;
    BlockID: number;
    AvailableSeats: number;
    TotalSeats: number;
    Status: string;
}

export const PriorityAssignModal: React.FC<PriorityAssignModalProps> = ({
    isOpen,
    onOpenChange,
    onAssignSuccess
}) => {
    const [step, setStep] = useState<'search' | 'room'>('search');
    const [studentRegNo, setStudentRegNo] = useState('');
    const [student, setStudent] = useState<StudentInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [floorFilter, setFloorFilter] = useState<number | null>(null);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const handleSearchStudent = async () => {
        if (!studentRegNo.trim()) {
            toast.error('Please enter a registration number');
            return;
        }

        setLoading(true);
        try {
            const data = await SeatingService.prioritySearchStudent(studentRegNo);
            setStudent(data);
            setStep('room');
            await loadAvailableRooms();
            toast.success('Student found!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Student not found');
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableRooms = async () => {
        setLoadingRooms(true);
        try {
            const data = await SeatingService.priorityGetAvailableRooms(floorFilter || undefined);
            setRooms(data);
        } catch (error: any) {
            toast.error('Failed to load rooms');
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleAssignStudent = async () => {
        if (!student || !selectedRoomId) {
            toast.error('Please select a room');
            return;
        }

        setAssigning(true);
        try {
            await SeatingService.priorityAssignStudent({
                studentId: student.StudentID,
                roomId: selectedRoomId
            });
            toast.success(`${student.FullName} assigned successfully!`);
            onAssignSuccess?.();
            handleClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Assignment failed');
        } finally {
            setAssigning(false);
        }
    };

    const handleClose = () => {
        setStep('search');
        setStudentRegNo('');
        setStudent(null);
        setRooms([]);
        setSelectedRoomId(null);
        setFloorFilter(null);
        onOpenChange(false);
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Priority Room Assignment
                        </ModalHeader>
                        <ModalBody>
                            {step === 'search' ? (
                                <div className="space-y-4">
                                    <Alert
                                        color="info"
                                        icon={<AlertCircle className="w-4 h-4" />}
                                        title="Priority Assignment"
                                        description="Assign students with accessibility needs to specific rooms"
                                    />
                                    <Input
                                        label="Student Registration Number"
                                        placeholder="e.g., STU001"
                                        value={studentRegNo}
                                        onValueChange={setStudentRegNo}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchStudent()}
                                        endContent={<Search className="w-4 h-4 opacity-50" />}
                                        disabled={loading}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {student && (
                                        <Card className="bg-default-50 p-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold">{student.FullName}</p>
                                                        <p className="text-sm text-default-500">{student.RegisterNumber}</p>
                                                    </div>
                                                    <Chip size="sm" color="primary">{student.Department}</Chip>
                                                </div>
                                                <p className="text-sm text-default-500">{student.Email}</p>
                                            </div>
                                        </Card>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Filter by Floor</label>
                                        <Input
                                            type="number"
                                            placeholder="Floor ID (optional)"
                                            value={floorFilter?.toString() || ''}
                                            onValueChange={(val) => setFloorFilter(val ? Number(val) : null)}
                                            onChange={loadAvailableRooms}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Select Room</label>
                                        {loadingRooms ? (
                                            <Skeleton className="h-24 rounded-lg" />
                                        ) : rooms.length === 0 ? (
                                            <div className="text-center py-4 text-default-500">
                                                No available rooms
                                            </div>
                                        ) : (
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {rooms.map((room) => (
                                                    <Card
                                                        key={room.RoomID}
                                                        isPressable
                                                        onClick={() => setSelectedRoomId(room.RoomID)}
                                                        className={`p-3 cursor-pointer transition-colors ${
                                                            selectedRoomId === room.RoomID
                                                                ? 'bg-primary-50 border-2 border-primary'
                                                                : 'bg-default-50 hover:bg-default-100'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-semibold">{room.RoomCode}</p>
                                                                <p className="text-sm text-default-500">
                                                                    Floor {room.FloorID} • Block {room.BlockID}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-semibold text-success">{room.AvailableSeats}</p>
                                                                <p className="text-sm text-default-500">
                                                                    / {room.TotalSeats} seats
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button color="default" variant="light" onPress={handleClose}>
                                Cancel
                            </Button>
                            {step === 'search' ? (
                                <Button
                                    color="primary"
                                    onPress={handleSearchStudent}
                                    isLoading={loading}
                                    startContent={!loading && <Search className="w-4 h-4" />}
                                >
                                    Search Student
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        color="default"
                                        variant="light"
                                        onPress={() => setStep('search')}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        color="success"
                                        onPress={handleAssignStudent}
                                        isLoading={assigning}
                                        isDisabled={!selectedRoomId}
                                        startContent={!assigning && <CheckCircle2 className="w-4 h-4" />}
                                    >
                                        Assign to Room
                                    </Button>
                                </>
                            )}
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
