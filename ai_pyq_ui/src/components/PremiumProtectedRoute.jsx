// src/components/PremiumProtectedRoute.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserData, isAuthenticated } from "../utils/auth";

export default function PremiumProtectedRoute({ children }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            // First check if user is authenticated
            if (!isAuthenticated()) {
                navigate("/login");
                return;
            }

            // Get user data
            const userData = getUserData();
            if (!userData) {
                // Try to fetch from API
                try {
                    const response = await fetch("/auth/me", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Check if user has premium subscription
                        if (data.subscription_plan === "premium") {
                            setHasAccess(true);
                        } else {
                            // Redirect to subscription page
                            navigate("/subscription");
                        }
                    } else {
                        navigate("/login");
                    }
                } catch (error) {
                    console.error("Error checking premium access:", error);
                    navigate("/login");
                }
            } else {
                // Check subscription from cached data
                if (userData.subscription_plan === "premium") {
                    setHasAccess(true);
                } else {
                    // Redirect to subscription page
                    navigate("/subscription");
                }
            }

            setIsLoading(false);
        };

        checkAccess();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Checking access...</p>
                </div>
            </div>
        );
    }

    if (!hasAccess) {
        return null; // Navigation will handle redirect
    }

    return children;
}

