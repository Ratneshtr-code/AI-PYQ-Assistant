// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

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
        const checkAuth = () => {
            const authenticated = localStorage.getItem("isLoggedIn") === "true";
            setIsAuthenticatedState(authenticated);
            setLoading(false);
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
        console.log("ProtectedRoute: Not authenticated (isLoggedIn=" + localStorage.getItem("isLoggedIn") + "), redirecting to login");
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    // Logged in - allow access (session cookie will be validated by backend)
    return children;
}

