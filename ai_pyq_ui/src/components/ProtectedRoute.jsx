// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser, isAuthenticated } from "../utils/auth";

/**
 * ProtectedRoute component - SIMPLIFIED
 * Checks if user is logged in (session-based auth)
 * Session cookie is validated by backend on API calls
 */
export default function ProtectedRoute({ children }) {
    const location = useLocation();
    const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // First check localStorage
            const authenticated = isAuthenticated();
            
            if (authenticated) {
                // localStorage says logged in - trust it
                setIsAuthenticatedState(true);
                setLoading(false);
            } else {
                // localStorage says not logged in, but check if we have a session cookie
                // This handles cases like Google OAuth where session is created but localStorage isn't set
                try {
                    const userData = await getCurrentUser();
                    if (userData) {
                        // We have a valid session! User is logged in
                        console.log("ProtectedRoute: Found valid session, user is authenticated");
                        setIsAuthenticatedState(true);
                        setLoading(false);
                        // Dispatch event to update other components
                        window.dispatchEvent(new Event("userLoggedIn"));
                        window.dispatchEvent(new Event("premiumStatusChanged"));
                    } else {
                        // No valid session - user is not logged in
                        setIsAuthenticatedState(false);
                        setLoading(false);
                    }
                } catch (error) {
                    // Error checking session - assume not logged in
                    console.error("ProtectedRoute: Error checking session:", error);
                    setIsAuthenticatedState(false);
                    setLoading(false);
                }
            }
        };

        checkAuth(); // Initial check

        // Listen for login/logout events
        window.addEventListener("userLoggedIn", checkAuth);
        window.addEventListener("userLoggedOut", checkAuth);

        return () => {
            window.removeEventListener("userLoggedIn", checkAuth);
            window.removeEventListener("userLoggedOut", checkAuth);
        };
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (!isAuthenticatedState) {
        console.log("ProtectedRoute: Not authenticated (isLoggedIn=" + localStorage.getItem("isLoggedIn") + "), redirecting to landing page");
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    // Logged in - allow access (session cookie will be validated by backend)
    return children;
}

