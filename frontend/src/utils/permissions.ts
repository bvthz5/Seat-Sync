import { User } from '../types/auth'; // Fix import path to match project structure
import { FeatureKey, ROOT_ONLY_FEATURES } from '../types/permission.types';

/**
 * Checks if a user has access to a specific feature.
 * 
 * Rules:
 * 1. If user is not logged in, access is denied.
 * 2. If feature is ROOT_ONLY, user MUST be IsRootAdmin.
 * 3. All other features are available to any 'exam_admin'.
 */
export const checkPermission = (user: User | null, feature: FeatureKey): boolean => {
    if (!user) return false;

    // Check strict Role Requirement
    if (user.Role !== 'exam_admin') {
        // Currently we only handle exam_admin in this logic, 
        // extensions for students/invigilators would go here.
        return false;
    }

    if (ROOT_ONLY_FEATURES.includes(feature)) {
        return user.IsRootAdmin === true;
    }

    // Default: Allowed for all exam_admins
    return true;
};
