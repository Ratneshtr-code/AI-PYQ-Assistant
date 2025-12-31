// src/components/Sidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Sidebar({ exam, setExam, examsList, onOpenSecondarySidebar, onCollapseChange }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Notify parent when collapse state changes
    useEffect(() => {
        if (onCollapseChange) {
            onCollapseChange(isCollapsed);
        }
    }, [isCollapsed, onCollapseChange]);
    
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
    const [isLoggingOut, setIsLoggingOut] = useState(false); // Flag to prevent re-authentication during logout
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
    const isAIRoadmap = location.pathname.includes("ai-roadmap");
    const isSearchPage = location.pathname.includes("search");

        // Check login status and subscription
    useEffect(() => {
        const updateUserState = async () => {
            // Don't check session if we're in the process of logging out
            if (isLoggingOut) {
                return;
            }
            
            // Check login status from localStorage (session cookie is checked by backend)
            let isLoggedInLocal = localStorage.getItem("isLoggedIn") === "true";
            
            // If localStorage says not logged in, check if we have a session cookie
            // This handles cases like Google OAuth where session is created but localStorage isn't set
            if (!isLoggedInLocal && !isLoggingOut) {
                try {
                    const response = await fetch("/auth/me", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                    });
                    
                    if (response.ok) {
                        const userData = await response.json();
                        // We have a valid session! User is logged in
                        console.log("Sidebar: Found valid session, syncing localStorage");
                        // Store user data in localStorage
                        localStorage.setItem("userData", JSON.stringify(userData));
                        localStorage.setItem("isLoggedIn", "true");
                        localStorage.setItem("userName", userData.full_name || userData.username || "User");
                        localStorage.setItem("userEmail", userData.email || "");
                        localStorage.setItem("hasPremium", userData.subscription_plan === "premium" ? "true" : "false");
                        isLoggedInLocal = true;
                        // Dispatch event to notify other components
                        window.dispatchEvent(new Event("userLoggedIn"));
                        window.dispatchEvent(new Event("premiumStatusChanged"));
                    }
                } catch (error) {
                    console.error("Sidebar: Error checking session:", error);
                }
            }
            
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
            // Don't update if we're logging out
            if (!isLoggingOut) {
                // Force immediate update when login/logout events fire
                updateUserState();
            }
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
    }, [isLoggingOut]); // Re-run if isLoggingOut changes


    const handleSignIn = () => {
        navigate("/login");
    };

    const handleSignUp = () => {
        navigate("/signup");
    };

    const handleSignOut = async () => {
        // Set logging out flag to prevent re-authentication
        setIsLoggingOut(true);
        
        // Call logout API first to delete session cookie
        try {
            await fetch("/auth/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Include cookies
            });
        } catch (error) {
            // Ignore API errors - continue with logout
            console.error("Logout API error (continuing anyway):", error);
        }
        
        // Clear all auth-related localStorage
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("hasPremium");
        localStorage.removeItem("userData");
        localStorage.removeItem("ui_mode");
        // Clear exam-related localStorage
        localStorage.removeItem("exam_attempts");
        localStorage.removeItem("examMode_testType");
        localStorage.removeItem("examMode_exam");
        localStorage.removeItem("examMode_subject");
        
        // Immediately update state
        setIsLoggedIn(false);
        setUserName("User");
        setUserInitials("U");
        setSubscriptionPlan("Free");
        
        // Dispatch logout events to update other components
        window.dispatchEvent(new Event("premiumStatusChanged"));
        window.dispatchEvent(new Event("userLoggedOut"));
        
        // Navigate to home
        navigate("/", { replace: true });
        
        // Reset logging out flag after a short delay (to ensure navigation completes)
        setTimeout(() => {
            setIsLoggingOut(false);
        }, 1000);
    };


    return (
        <aside
            className={`fixed top-0 left-0 z-40 h-screen bg-white shadow-md border-r border-gray-200 flex flex-col transition-all duration-300 ${
                isCollapsed ? "w-16" : "w-64"
            }`}
        >
            {/* Header with Logo and Collapse Button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                {!isCollapsed && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Product Logo/Icon - Placeholder */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-800 truncate">AI PYQ Assistant</span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto">
                        <span className="text-white font-bold text-xs">AI</span>
                    </div>
                )}
                <button
                    onClick={() => {
                        const newCollapsedState = !isCollapsed;
                        setIsCollapsed(newCollapsedState);
                        // If collapsing Primary Sidebar, also close Secondary Sidebar
                        if (newCollapsedState && onOpenSecondarySidebar) {
                            // Close Secondary Sidebar when Primary Sidebar collapses
                            // This will be handled by the parent component
                        }
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
                    title={isCollapsed ? "Open sidebar" : "Close sidebar"}
                    aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {/* Chevron icon - Standard expand/collapse */}
                        {isCollapsed ? (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        ) : (
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        )}
                    </svg>
                </button>
            </div>

            {/* Main Navigation Section */}
            <div className="flex-1 overflow-y-auto px-4 py-6">

                {/* Navigation Buttons */}
                <div className="space-y-1">
                    <button
                        onClick={() => {
                            navigate("/exam-dashboard");
                            if (onOpenSecondarySidebar) {
                                setTimeout(() => onOpenSecondarySidebar(), 100);
                            }
                        }}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                            isDashboard
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                        title="Exam Dashboard"
                    >
                        <span className="text-lg flex-shrink-0">📊</span>
                        {!isCollapsed && <span>Exam Dashboard</span>}
                    </button>

                    <button
                        onClick={() => {
                            navigate("/cross-exam-insights");
                            if (onOpenSecondarySidebar) {
                                setTimeout(() => onOpenSecondarySidebar(), 100);
                            }
                        }}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                            location.pathname.includes("cross-exam-insights")
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                        title="Cross-Exam Insights"
                    >
                        <span className="text-lg flex-shrink-0">🔍</span>
                        {!isCollapsed && <span>Cross-Exam Insights</span>}
                    </button>

                    <button
                        onClick={() => navigate("/search")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                            isSearchPage
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                        title="PYQ Semantic Search"
                    >
                        <span className="text-lg flex-shrink-0">🧠</span>
                        {!isCollapsed && <span>PYQ Semantic Search</span>}
                    </button>

                    <button
                        onClick={() => navigate("/topic-wise-pyq")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                            location.pathname.includes("topic-wise-pyq")
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                        title="Topic-wise PYQ"
                    >
                        <span className="text-lg flex-shrink-0">📑</span>
                        {!isCollapsed && <span>Topic-wise PYQ</span>}
                    </button>

                    <button
                        onClick={() => navigate("/exam-mode")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                            location.pathname.includes("exam-mode")
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50 font-normal"
                        }`}
                        title="Test Series"
                    >
                        <span className="text-lg flex-shrink-0">📝</span>
                        {!isCollapsed && <span>Test Series</span>}
                    </button>

                    {/* Smart Roadmap - Only visible to logged-in users */}
                    {(localStorage.getItem("isLoggedIn") === "true" || isLoggedIn) && (
                        <button
                            onClick={() => navigate("/ai-roadmap")}
                            className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                                location.pathname.includes("ai-roadmap")
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-gray-700 hover:bg-gray-50 font-normal"
                            }`}
                            title="Smart Roadmap"
                        >
                            <span className="text-lg flex-shrink-0">🎯</span>
                            {!isCollapsed && <span>Smart Roadmap</span>}
                        </button>
                    )}

                    {/* My Notes - Only visible to logged-in users */}
                    {(localStorage.getItem("isLoggedIn") === "true" || isLoggedIn) && (
                        <button
                            onClick={() => navigate("/my-notes")}
                            className={`w-full text-left py-2 px-3 rounded-lg transition text-sm flex items-center gap-2 ${
                                location.pathname.includes("my-notes")
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-gray-700 hover:bg-gray-50 font-normal"
                            }`}
                            title="My Notes"
                        >
                            <span className="text-lg flex-shrink-0">📝</span>
                            {!isCollapsed && <span>My Notes</span>}
                        </button>
                    )}
                </div>
            </div>

            {/* Spacer for visual separation */}
            <div className="h-4"></div>

            {/* Account Card Section (Sticky Bottom) */}
            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
                {/* Check login status from localStorage */}
                {localStorage.getItem("isLoggedIn") === "true" || isLoggedIn ? (
                    /* Logged In State */
                    <div className={`mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm ${isCollapsed ? "p-2" : ""}`}>
                        {isCollapsed ? (
                            /* Collapsed: Show only avatar */
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm mx-auto">
                                {userInitials}
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                ) : (
                    /* Logged Out State */
                    <div className={`mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm ${isCollapsed ? "p-2" : ""}`}>
                        {isCollapsed ? (
                            /* Collapsed: Show only sign in icon */
                            <button
                                onClick={handleSignIn}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center mx-auto transition-colors"
                                title="Sign In"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </button>
                        ) : (
                            <>
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
                            </>
                        )}
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
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {!isCollapsed && <span>My Account</span>}
                    </button>
                    {(localStorage.getItem("isLoggedIn") === "true" || isLoggedIn) && (
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition py-2 px-3 rounded-lg font-normal hover:font-medium"
                            title="Sign Out"
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {!isCollapsed && <span>Sign Out</span>}
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}
