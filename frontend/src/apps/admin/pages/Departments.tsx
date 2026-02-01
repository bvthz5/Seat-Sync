import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner, Button } from '@heroui/react';
import { ChevronRight, Building2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../../services/api';

interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
    studentCount?: number;
}

const Departments: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await api.get<Department[]>('/departments');
                setDepartments(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch departments", err);
                setError("Failed to load departments. Please try again.");
                setLoading(false);
            }
        };

        fetchDepartments();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Spinner size="lg" color="primary" label="Loading Departments..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] text-slate-400 gap-4">
                <AlertCircle size={48} className="text-red-400" />
                <p className="font-semibold">{error}</p>
                <Button variant="flat" onPress={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    return (
        <motion.div
            className="p-8 max-w-[1200px] mx-auto space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 rounded-xl">
                    <Building2 className="text-blue-600" size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Departments</h1>
                    <p className="text-slate-500 font-medium">Overview of all academic departments</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {departments.map((dept) => (
                    <motion.div key={dept.DepartmentID} variants={itemVariants}>
                        <Card
                            isPressable
                            onPress={() => navigate(`/admin/departments/${dept.DepartmentID}`)}
                            className="w-full border-none shadow-sm hover:shadow-md transition-all bg-white group"
                        >
                            <CardBody className="p-4 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-12 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                            {dept.DepartmentName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {dept.DepartmentCode}
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">
                                                {dept.studentCount || 0} Students
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                                    <ChevronRight size={24} />
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                ))}

                {departments.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        No departments found.
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Departments;
