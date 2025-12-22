// src/components/Sidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getUIMode, setUIMode, UI_MODES, isAdminMode } from "../config/uiConfig";

export default function Sidebar({ exam, setExam, examsList, onOpenSecondarySidebar }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [uiMode, setUiModeState] = useState(getUIMode());
    const [allowModeSwitching, setAllowModeSwitching] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState("Ratnesh");
    const [userInitials, setUserInitials] = useState("RT");
    const [subscriptionPlan, setSubscriptionPlan] = useState("Premium"); // "Free" or "Premium"

    const isDashboard = location.pathname.includes("exam-dashboard");
    const isCrossExam = location.pathname.includes("cross-exam-insights");
    const isSearchPage =
        location.pathname.includes("search") || (location.pathname === "/" && !isDashboard && !isCrossExam);

    // Fetch UI config from backend
    useEffect(() => {
        const fetchUIConfig = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/ui-config");
                const data = await res.json();
                setAllowModeSwitching(data.allow_mode_switching || false);
            } catch (err) {
                console.error("Failed to fetch UI config:", err);
                // Default to false (secure by default)
                setAllowModeSwitching(false);
            }
        };
        fetchUIConfig();
    }, []);

    // Check login status and subscription (mock implementation)
    useEffect(() => {
        const updateUserState = () => {
            // Check if admin mode is active - if so, treat as logged in
            const adminActive = isAdminMode();
            // Mock: Check localStorage for user session
            const loggedIn = localStorage.getItem("isLoggedIn") === "true" || adminActive;
            const premium = localStorage.getItem("hasPremium") === "true";
            
            setIsLoggedIn(loggedIn);
            
            if (loggedIn) {
                setSubscriptionPlan(premium ? "Premium" : "Free");
                // Get user name from localStorage or use default
                // If admin mode, use "Admin" as name
                const savedName = adminActive 
                    ? (localStorage.getItem("userName") || "Admin")
                    : (localStorage.getItem("userName") || "Ratnesh");
                setUserName(savedName);
                // Generate initials
                const names = savedName.split(" ");
                const initials = names.length > 1 
                    ? (names[0][0] + names[1][0]).toUpperCase()
                    : savedName.substring(0, 2).toUpperCase();
                setUserInitials(initials);
            } else {
                setSubscriptionPlan("Free");
            }
        };

        // Initial load
        updateUserState();

        // Listen for storage changes (when user logs in/out or upgrades)
        const handleStorageChange = (e) => {
            if (e.key === "isLoggedIn" || e.key === "hasPremium" || e.key === "userName") {
                updateUserState();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        
        // Also listen for custom events (for same-tab updates)
        const handleCustomStorage = () => {
            updateUserState();
        };
        window.addEventListener("premiumStatusChanged", handleCustomStorage);
        
        // Listen for UI mode changes (admin mode toggle)
        const handleModeChange = () => {
            updateUserState();
        };
        window.addEventListener("uiModeChanged", handleModeChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("premiumStatusChanged", handleCustomStorage);
            window.removeEventListener("uiModeChanged", handleModeChange);
        };
    }, []);

    // Toggle admin mode (only if allowed by backend config)
    const toggleAdminMode = () => {
        if (!allowModeSwitching) {
            return; // Do nothing if mode switching is disabled
        }
        const newMode = uiMode === UI_MODES.ADMIN ? UI_MODES.USER : UI_MODES.ADMIN;
        setUIMode(newMode);
        setUiModeState(newMode);
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('uiModeChanged'));
    };

    const handleSignIn = () => {
        navigate("/login");
    };

    const handleSignUp = () => {
        navigate("/signup");
    };

    const handleSignOut = () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userName");
        setIsLoggedIn(false);
        setSubscriptionPlan("Free");
        // Optionally navigate to home
        navigate("/");
    };


    return (
        <aside
            className="fixed top-0 left-0 z-40 h-screen w-64 bg-white shadow-md border-r border-gray-200 flex flex-col"
        >
            {/* Main Navigation Section */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {isDashboard ? "Exam Dashboard" : isCrossExam ? "Cross-Exam Insights" : "PYQ Assistant"}
                </h2>

                {/* Filter (only show on Search Page or Dashboard) */}
                {(isSearchPage || isDashboard) && (
                    <div className="mb-6">
                        <label className="block text-sm text-gray-500 mb-1">
                            Filter by Exam
                        </label>
                        <select
                            value={exam}
                            onChange={(e) => setExam(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="">All Exams</option>
                            {examsList.map((ex, idx) => (
                                <option key={idx} value={ex}>
                                    {ex}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="space-y-1">
                    <button
                        onClick={() => navigate("/")}
                        className={`w-full text-left py-2.5 px-3 rounded-lg transition ${
                            isSearchPage
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
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
                        className={`w-full text-left py-2.5 px-3 rounded-lg transition ${
                            isDashboard
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
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
                        className={`w-full text-left py-2.5 px-3 rounded-lg transition ${
                            location.pathname.includes("cross-exam-insights")
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        🔍 Cross-Exam Insights
                    </button>

                    <button
                        onClick={() => {}}
                        className="w-full text-left py-2.5 px-3 rounded-lg transition text-gray-500 hover:bg-gray-50 opacity-60 cursor-not-allowed"
                        disabled
                    >
                        📑 Topic-wise PYQ
                    </button>

                    <button
                        onClick={() => {}}
                        className="w-full text-left py-2.5 px-3 rounded-lg transition text-gray-500 hover:bg-gray-50 opacity-60 cursor-not-allowed"
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
                {isLoggedIn ? (
                    /* Logged In State */
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {userName}
                                    </p>
                                    {/* Admin Badge */}
                                    {isAdminMode() && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                                            Admin
                                        </span>
                                    )}
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
                                onClick={() => navigate("/subscription")}
                                className="w-full mt-2 py-1.5 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                                Upgrade to Premium
                            </button>
                        )}
                        {/* View Subscription for Premium users */}
                        {subscriptionPlan === "Premium" && (
                            <button
                                onClick={() => navigate("/subscription")}
                                className="w-full mt-2 py-1.5 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
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
                        onClick={() => navigate("/settings")}
                        className="w-full flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition py-2 px-3 rounded-lg font-medium"
                        title="Settings"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                    </button>
                    {isLoggedIn && (
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition py-2 px-3 rounded-lg font-medium"
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
