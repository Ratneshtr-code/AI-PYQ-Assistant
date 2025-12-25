/**
 * UI Configuration
 * Admin status is determined by logged-in user's is_admin field in database
 * No separate "mode" - admin features are shown based on user.is_admin
 */

import { getUserData } from "../utils/auth";

/**
 * Check if current logged-in user is an admin
 * Returns true only if user is logged in AND has is_admin = true in database
 */
export const isUserAdmin = () => {
    const userData = getUserData();
    return userData?.is_admin === true;
};

// UI feature flags based on admin status
export const uiFeatures = {
    showDebugId: () => isUserAdmin(),
    // Add more feature flags here as needed
};

