// src/utils/auth.js
/**
 * SIMPLE SESSION-BASED AUTH - NO TOKEN MANAGEMENT!
 * Cookies are automatically sent by the browser - we don't need to do anything!
 */

// Use relative URLs when using Vite proxy (same-origin), or absolute URLs for direct access
// With Vite proxy configured, we can use relative URLs which makes cookies work properly
const API_BASE_URL = ""; // Empty string = same origin (Vite proxy handles it)
// For direct access (without proxy), use: "http://127.0.0.1:8000"

/**
 * Store user data in localStorage (for UI display only)
 */
export const setUserData = (userData) => {
    const normalizedUserData = {
        ...userData,
        is_admin: userData.is_admin === true || userData.is_admin === "true" || userData.is_admin === 1
    };
    
    localStorage.setItem("userData", JSON.stringify(normalizedUserData));
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userName", normalizedUserData.full_name || normalizedUserData.username);
    localStorage.setItem("userEmail", normalizedUserData.email);
    localStorage.setItem("hasPremium", normalizedUserData.subscription_plan === "premium" ? "true" : "false");
};

/**
 * Get user data from localStorage
 */
export const getUserData = () => {
    const data = localStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
};

/**
 * Clear all user data (on logout)
 */
export const clearAuth = () => {
    localStorage.removeItem("userData");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("hasPremium");
    localStorage.removeItem("ui_mode");
};

/**
 * Check if user is authenticated (based on localStorage - session cookie is checked by backend)
 */
export const isAuthenticated = () => {
    return localStorage.getItem("isLoggedIn") === "true";
};

/**
 * Make authenticated API request
 * SIMPLE: Just make the request - cookies are sent automatically!
 */
export const authenticatedFetch = async (url, options = {}) => {
    // Build headers
    const headers = {
        "Content-Type": "application/json",
        ...options.headers, // Allow override
    };

    // Make the request - cookies are automatically included!
    const fetchOptions = {
        ...options,
        headers,
        credentials: "include", // Important: include cookies in requests
    };
    
    // Debug: Log the request
    console.log("authenticatedFetch:", url, "with credentials: include");
    
    const response = await fetch(url, fetchOptions);
    
    // Debug: Log if we got 401
    if (response.status === 401) {
        console.warn("401 Unauthorized from", url, "- session cookie may not be sent");
    }
    
    return response;
};

/**
 * Get current user info
 * SIMPLE: Just fetch from API - cookies are sent automatically!
 */
export const getCurrentUser = async () => {
    try {
        console.log("getCurrentUser: Fetching /auth/me with credentials: include");
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include", // Include cookies
        });
        
        console.log("getCurrentUser: Response status:", response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log("getCurrentUser: Success, user data received");
            setUserData(userData);
            return userData;
        } else {
            // If 401, user is not authenticated
            if (response.status === 401) {
                console.warn("getCurrentUser: 401 Unauthorized - session cookie may be missing or invalid");
                // Don't clear auth immediately - let the user see the page
                // clearAuth();
            }
            return null;
        }
    } catch (error) {
        console.error("Failed to get current user:", error);
        return null;
    }
};
