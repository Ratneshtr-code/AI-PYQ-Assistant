// src/components/Sidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Sidebar({ exam, setExam, examsList, onOpenSecondarySidebar }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Initialize state from localStorage immediately to prevent flash of wrong state
    const initialUserData = (() => {
        try {
            const data = localStorage.getItem("userData");
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    })();
    
    const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem("isLoggedIn") === "true");
    const [userName, setUserName] = useState(
        initialUserData?.full_name || initialUserData?.username || localStorage.getItem("userName") || "User"
    );
    const [userInitials, setUserInitials] = useState(() => {
        const name = initialUserData?.full_name || initialUserData?.username || localStorage.getItem("userName") || "User";
        const names = name.split(" ");
        return names.length > 1 
            ? (names[0][0] + names[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    });
    const [subscriptionPlan, setSubscriptionPlan] = useState(
        initialUserData?.subscription_plan === "premium" ? "Premium" : "Free"
    );

    const isDashboard = location.pathname.includes("exam-dashboard");
    const isCrossExam = location.pathname.includes("cross-exam-insights");
    const isSearchPage =
        location.pathname.includes("search") || (location.pathname === "/" && !isDashboard && !isCrossExam);

        // Check login status and subscription
    useEffect(() => {
        const updateUserState = async () => {
            // Check login status from localStorage (session cookie is checked by backend)
            const isLoggedInLocal = localStorage.getItem("isLoggedIn") === "true";
            setIsLoggedIn(isLoggedInLocal);
            
            // If not logged in, clear state and exit early
            if (!isLoggedInLocal) {
                setSubscriptionPlan("Free");
                setUserName("User");
                setUserInitials("U");
                return;
            }
            
            // Token exists - user is logged in, proceed with loading user data
            // First, try to use cached user data for immediate UI update
            const userDataStr = localStorage.getItem("userData");
            if (userDataStr) {
                try {
                    const cachedUserData = JSON.parse(userDataStr);
                    setSubscriptionPlan(cachedUserData.subscription_plan === "premium" ? "Premium" : "Free");
                    const savedName = cachedUserData.full_name || cachedUserData.username || "User";
                    setUserName(savedName);
                    const names = savedName.split(" ");
                    const initials = names.length > 1 
                        ? (names[0][0] + names[1][0]).toUpperCase()
                        : savedName.substring(0, 2).toUpperCase();
                    setUserInitials(initials);
                } catch (parseErr) {
                    console.error("Error parsing cached user data:", parseErr);
                }
            }
            
            // OPTIONAL: Try to fetch fresh user data from backend
            // Cookies are sent automatically - no token needed!
            if (isLoggedInLocal) {
                // Make API call in background - don't wait for it or clear state on failure
                fetch("/auth/me", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include", // Include cookies
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    // If 401 or other error, just ignore - keep using cached data
                    return null;
                })
                .then(userData => {
                    if (userData) {
                        // Update with fresh data
                        const normalizedUserData = {
                            ...userData,
                            is_admin: userData.is_admin === true || userData.is_admin === "true" || userData.is_admin === 1
                        };
                        localStorage.setItem("userData", JSON.stringify(normalizedUserData));
                        setSubscriptionPlan(normalizedUserData.subscription_plan === "premium" ? "Premium" : "Free");
                        const savedName = normalizedUserData.full_name || normalizedUserData.username || "User";
                        setUserName(savedName);
                        const names = savedName.split(" ");
                        const initials = names.length > 1 
                            ? (names[0][0] + names[1][0]).toUpperCase()
                            : savedName.substring(0, 2).toUpperCase();
                        setUserInitials(initials);
                    }
                })
                .catch(() => {
                    // Network error - ignore, keep using cached data
                });
            }
        };

        // Initial load
        updateUserState();

        // Listen for storage changes (when user logs in/out or upgrades)
        const handleStorageChange = (e) => {
            if (e.key === "isLoggedIn" || e.key === "hasPremium" || e.key === "userName" || e.key === "authToken" || e.key === "userData") {
                updateUserState();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        
        // Also listen for custom events (for same-tab updates)
        const handleCustomEvent = () => {
            // Force immediate update when login/logout events fire
            updateUserState();
        };
        window.addEventListener("premiumStatusChanged", handleCustomEvent);
        window.addEventListener("userLoggedIn", handleCustomEvent);
        window.addEventListener("userLoggedOut", handleCustomEvent);
        window.addEventListener("userProfileUpdated", handleCustomEvent); // Listen for profile updates
        
        // Also listen for focus events (when user returns to tab after login)
        const handleFocus = () => {
            updateUserState();
        };
        window.addEventListener("focus", handleFocus);
        
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("premiumStatusChanged", handleCustomEvent);
            window.removeEventListener("userLoggedIn", handleCustomEvent);
            window.removeEventListener("userLoggedOut", handleCustomEvent);
            window.removeEventListener("userProfileUpdated", handleCustomEvent);
            window.removeEventListener("focus", handleFocus);
        };
    }, []); // Run once on mount, then rely on events and polling


    const handleSignIn = () => {
        navigate("/login");
    };

    const handleSignUp = () => {
        navigate("/signup");
    };

    const handleSignOut = async () => {
        // Clear all auth-related localStorage
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("hasPremium");
        localStorage.removeItem("userData");
        localStorage.removeItem("ui_mode");
        
        // Immediately update state
        setIsLoggedIn(false);
        setUserName("User");
        setUserInitials("U");
        setSubscriptionPlan("Free");
        
        // Dispatch logout events to update other components
        window.dispatchEvent(new Event("premiumStatusChanged"));
        window.dispatchEvent(new Event("userLoggedOut"));
        
        // Call logout API to delete session cookie
        fetch("/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include", // Include cookies
        }).catch(() => {
            // Ignore API errors - logout is already complete locally
        });
        
        // Navigate to home
        navigate("/");
    };


    return (
        <aside
            className="fixed top-0 left-0 z-40 h-screen w-64 bg-white shadow-md border-r border-gray-200 flex flex-col"
        >
            {/* Main Navigation Section */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                    {isDashboard ? "Exam Dashboard" : isCrossExam ? "Cross-Exam Insights" : "PYQ Assistant"}
                </h2>

                {/* Navigation Buttons */}
                <div className="space-y-1">
                    <button
                        onClick={() => navigate("/")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm ${
                            isSearchPage
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                    >
                        🧠 PYQ Assistant
                    </button>

                    <button
                        onClick={() => {
                            navigate("/exam-dashboard");
                            if (onOpenSecondarySidebar) {
                                setTimeout(() => onOpenSecondarySidebar(), 100);
                            }
                        }}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm ${
                            isDashboard
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                    >
                        📊 Exam Dashboard
                    </button>

                    <button
                        onClick={() => {
                            navigate("/cross-exam-insights");
                            if (onOpenSecondarySidebar) {
                                setTimeout(() => onOpenSecondarySidebar(), 100);
                            }
                        }}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm ${
                            location.pathname.includes("cross-exam-insights")
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                    >
                        🔍 Cross-Exam Insights
                    </button>

                    <button
                        onClick={() => navigate("/topic-wise-pyq")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm ${
                            location.pathname.includes("topic-wise-pyq")
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                    >
                        📑 Topic-wise PYQ
                    </button>

                    <button
                        onClick={() => {}}
                        className="w-full text-left py-2 px-3 rounded-lg transition text-sm text-gray-500 hover:bg-gray-50 opacity-60 cursor-not-allowed"
                        disabled
                    >
                        🕸️ Concept Graph Explorer
                    </button>
                </div>
            </div>

            {/* Spacer for visual separation */}
            <div className="h-4"></div>

            {/* Account Card Section (Sticky Bottom) */}
            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                {/* Check login status from localStorage */}
                {localStorage.getItem("isLoggedIn") === "true" || isLoggedIn ? (
                    /* Logged In State */
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-normal text-gray-900 truncate">
                                        {userName}
                                    </p>
                                    {/* Admin Badge - Only show if user is database admin */}
                                    {(() => {
                                        try {
                                            const userData = JSON.parse(localStorage.getItem("userData") || "{}");
                                            return userData.is_admin ? (
                                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                                                    Admin
                                                </span>
                                            ) : null;
                                        } catch {
                                            return null;
                                        }
                                    })()}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {subscriptionPlan === "Premium" ? (
                                        <>
                                            <span className="text-xs font-medium text-emerald-700">Premium</span>
                                            <span className="text-emerald-600">✓</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs text-gray-500">Free Plan</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Upgrade CTA for Free users */}
                        {subscriptionPlan === "Free" && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log("Navigating to /subscription");
                                    navigate("/subscription");
                                }}
                                className="w-full mt-2 py-1.5 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                type="button"
                            >
                                Upgrade to Premium
                            </button>
                        )}
                        {/* View Subscription for Premium users */}
                        {subscriptionPlan === "Premium" && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log("Navigating to /subscription");
                                    navigate("/subscription");
                                }}
                                className="w-full mt-2 py-1.5 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                type="button"
                            >
                                Manage Subscription
                            </button>
                        )}
                    </div>
                ) : (
                    /* Logged Out State */
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-600 mb-3 text-center">
                            Sign in to unlock insights
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSignIn}
                                className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={handleSignUp}
                                className="flex-1 py-2 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Utilities (Icon-first, more visible) */}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Navigating to /account, isLoggedIn:", localStorage.getItem("isLoggedIn"));
                            navigate("/account");
                        }}
                        className={`w-full flex items-center gap-2 text-sm transition py-2 px-3 rounded-lg cursor-pointer font-normal ${
                            location.pathname === "/account"
                                ? "text-blue-700 bg-blue-50 font-medium"
                                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                        title="My Account"
                        type="button"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>My Account</span>
                    </button>
                    {(localStorage.getItem("isLoggedIn") === "true" || isLoggedIn) && (
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition py-2 px-3 rounded-lg font-normal hover:font-medium"
                            title="Sign Out"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign Out</span>
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
