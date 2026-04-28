import React from 'react';
import {
    LayoutDashboard,
    GraduationCap,
    FileText,
    Armchair,
    Users,
    ClipboardCheck,
    BarChart3,
    ShieldAlert,
    Building2,
    Siren,
    Settings,
    Activity,
    Bell,
    Lock,
    BookOpen,
    Calendar
} from 'lucide-react';

export interface SidebarItem {
    label: string;
    icon: React.ReactNode;
    path?: string;
    children?: SidebarItem[];
    requiresRoot?: boolean;
}

export const sidebarConfig: SidebarItem[] = [
    // ==================== PRIMARY OPERATIONS ====================
    // Visible to ALL Exam Admins
    {
        label: "Dashboard",
        icon: <LayoutDashboard size={20} />,
        path: "/admin/dashboard",
        requiresRoot: false
    },
    {
        label: "Students",
        icon: <GraduationCap size={20} />,
        path: "/admin/students",
        requiresRoot: false
    },

    {
        label: "Exams",
        icon: <FileText size={20} />,
        path: "/admin/exams",
        requiresRoot: false
    },
    {
        label: "Seating Plans",
        icon: <Armchair size={20} />,
        path: "/admin/seating",
        requiresRoot: false
    },
    {
        label: "Invigilators",
        icon: <Users size={20} />,
        path: "/admin/invigilators",
        requiresRoot: false
    },
    {
        label: "Invigilator Assign",
        icon: <ClipboardCheck size={20} />,
        path: "/admin/invigilators/assign",
        requiresRoot: false
    },
    {
        label: "Attendance",
        icon: <ClipboardCheck size={20} />,
        path: "/admin/attendance",
        requiresRoot: false
    },
    {
        label: "Reports",
        icon: <BarChart3 size={20} />,
        path: "/admin/reports",
        requiresRoot: false
    },

    // ==================== ADMINISTRATION SECTION ====================
    // Root Admin Only - Expandable Section
    {
        label: "Administration",
        icon: <ShieldAlert size={20} />,
        requiresRoot: true,
        children: [
            {
                label: "Admin Management",
                icon: <ShieldAlert size={18} />,
                path: "/admin/admin-management",
                requiresRoot: true
            },
            {
                label: "College Structure",
                icon: <Building2 size={18} />,
                path: "/admin/college-structure",
                requiresRoot: true
            },
            {
                label: "Academic Setup",
                icon: <BookOpen size={18} />,
                path: "/admin/academic-setup",
                requiresRoot: true
            },
            {
                label: "Exam Control",
                icon: <Siren size={18} />,
                path: "/admin/exam-control",
                requiresRoot: true
            },
            {
                label: "Notifications",
                icon: <Bell size={18} />,
                path: "/admin/notifications",
                requiresRoot: true
            },
            {
                label: "Audit & Logs",
                icon: <Activity size={18} />,
                path: "/admin/audit-logs",
                requiresRoot: true
            },
            {
                label: "Security",
                icon: <Lock size={18} />,
                path: "/admin/security",
                requiresRoot: true
            }
        ]
    }
];

