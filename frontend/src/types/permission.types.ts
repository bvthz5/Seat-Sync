export type FeatureKey =
    // Core Operations (All Admins)
    | 'dashboard'
    | 'students'
    | 'subjects'
    | 'exams'
    | 'seating_plans'
    | 'invigilators'
    | 'attendance'
    | 'reports'
    | 'notifications'

    // Administration (Root Only)
    | 'admin_management'
    | 'college_structure'
    | 'seating_configuration'
    | 'system_logs'
    | 'global_settings'
    | 'exam_status_control';

export const ADMIN_FEATURES: FeatureKey[] = [
    'dashboard', 'students', 'subjects', 'exams',
    'seating_plans', 'invigilators', 'attendance',
    'reports', 'notifications'
];

export const ROOT_ONLY_FEATURES: FeatureKey[] = [
    'admin_management', 'college_structure',
    'seating_configuration', 'system_logs',
    'global_settings', 'exam_status_control'
];
