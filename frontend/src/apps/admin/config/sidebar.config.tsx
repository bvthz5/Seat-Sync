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
    Lock
} from 'lucide-react';

export interface SidebarItem {
    label: string;
    icon: React.ReactNode;
    path?: string;
    children?: SidebarItem[];
    requiresRoot?: boolean;
}

export const sidebarConfig: SidebarItem[] = [
    // Standard Exam Admin Items
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

    // Root Admin "Administration" Section
    // We treat this logic slightly differently in rendering (as a section), 
    // but here we define the children that belong to it.
    {
        label: "Administration",
        icon: <ShieldAlert size={20} />, // Icon for the section header if needed
        requiresRoot: true,
        children: [
            {
                label: "Admin Management",
                icon: <ShieldAlert size={18} />,
                path: "/admin/manage-admins",
                requiresRoot: true
            },
            {
                label: "College Structure",
                icon: <Building2 size={18} />,
                path: "/admin/structure",
                requiresRoot: true
            },
            {
                label: "Exam Control",
                icon: <Siren size={18} />,
                path: "/admin/control",
                requiresRoot: true
            },
            {
                label: "System Configuration",
                icon: <Settings size={18} />,
                path: "/admin/settings",
                requiresRoot: true
            },
            {
                label: "Audit & Logs",
                icon: <Activity size={18} />,
                path: "/admin/logs",
                requiresRoot: true
            },
            {
                label: "Notifications",
                icon: <Bell size={18} />,
                path: "/admin/notifications",
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
