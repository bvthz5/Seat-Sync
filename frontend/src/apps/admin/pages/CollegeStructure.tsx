import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Building2, GraduationCap, BookOpen, ChevronRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

const CollegeStructure: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isRootAdmin = user?.IsRootAdmin === true;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50/30 flex items-center justify-center p-6">
            <Card className="w-full max-w-4xl border border-slate-200/60 shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white/80 backdrop-blur-xl">
                <CardBody className="p-0">
                    {/* Header */}
                    <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-sm border border-violet-100">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">College Structure</h1>
                                <p className="text-slate-500 font-medium">Select the infrastructure pipeline you wish to manage</p>
                            </div>
                        </div>
                    </div>

                    {/* Selection Area */}
                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Internal Exam Card */}
                        <Card 
                            isPressable 
                            onPress={() => navigate('/admin/college-structure/internal')}
                            className="group border-2 border-slate-100 hover:border-violet-500/30 bg-white shadow-sm hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-400 rounded-[32px] p-2"
                        >
                            <CardBody className="flex flex-col items-center text-center p-8 gap-6">
                                <div className="w-24 h-24 rounded-3xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ring-8 ring-violet-50/50">
                                    <BookOpen size={44} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Internal Exam</h2>
                                    <p className="text-slate-500 text-sm font-medium">Classroom-style infrastructure with dual-seating logic.</p>
                                </div>
                                <div className="h-px w-full bg-slate-100 mt-2" />
                                <Button 
                                    variant="light" 
                                    className="font-black text-violet-600 uppercase tracking-widest text-xs h-12 px-6"
                                    endContent={<ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                >
                                    Configure Structure
                                </Button>
                            </CardBody>
                        </Card>

                        {/* End Sem Exam Card */}
                        <Card 
                            isPressable 
                            onPress={() => navigate('/admin/college-structure/endsem')}
                            className="group border-2 border-slate-100 hover:border-purple-500/30 bg-white shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-400 rounded-[32px] p-2"
                        >
                            <CardBody className="flex flex-col items-center text-center p-8 gap-6">
                                <div className="w-24 h-24 rounded-3xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ring-8 ring-purple-50/50">
                                    <GraduationCap size={44} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">End Semester Exam</h2>
                                    <p className="text-slate-500 text-sm font-medium">Standard university-style layout with optimized capacity.</p>
                                </div>
                                <div className="h-px w-full bg-slate-100 mt-2" />
                                <Button 
                                    variant="light" 
                                    className="font-black text-purple-600 uppercase tracking-widest text-xs h-12 px-6"
                                    endContent={<ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                >
                                    Configure Structure
                                </Button>
                            </CardBody>
                        </Card>
                    </div>

                    {!isRootAdmin && (
                        <div className="px-10 pb-10 flex items-center gap-4 text-amber-600">
                            <ShieldAlert size={20} />
                            <p className="text-xs font-bold uppercase tracking-widest">Read-Only Mode Active</p>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default CollegeStructure;

