// src/AccountPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import { getCurrentUser, getUserData, authenticatedFetch, setUserData } from "./utils/auth";

// Use empty string for Vite proxy (same-origin)
const API_BASE_URL = "";

export default function AccountPage() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [userIsAdmin, setUserIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // User data state
    const [userData, setUserDataState] = useState(null);
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [refreshKey, setRefreshKey] = useState(0); // Force re-render when subscription changes
    const [subscriptionPlan, setSubscriptionPlan] = useState("free"); // Subscription plan state for reactive updates
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Force re-render when subscription changes
    
    // Edit states
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    // Password change form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // Messages
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Separate effect to refresh data when page becomes visible (user navigates back)
    useEffect(() => {
        const handleFocus = () => {
            // When user returns to this tab/page, refresh user data
            console.log("AccountPage: Page focused, refreshing user data...");
            const loadUserData = async () => {
                try {
                    const cachedUserData = getUserData();
                    if (cachedUserData) {
                        setUserDataState(cachedUserData);
                        setFullName(cachedUserData.full_name || "");
                        setUsername(cachedUserData.username || "");
                        setEmail(cachedUserData.email || "");
                        setUserIsAdmin(cachedUserData.is_admin === true);
                    }
                    // Also fetch fresh data from backend
                    getCurrentUser()
                        .then(user => {
                            if (user) {
                                setUserDataState(user);
                                setFullName(user.full_name || "");
                                setUsername(user.username || "");
                                setEmail(user.email || "");
                                setUserIsAdmin(user.is_admin === true);
                            }
                        })
                        .catch(() => {
                            // Ignore errors
                        });
                } catch (err) {
                    console.error("Failed to refresh user data:", err);
                }
            };
            loadUserData();
        };
        
        window.addEventListener("focus", handleFocus);
        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, []);

    useEffect(() => {
        // Fetch exams list for sidebar
        const fetchExams = async () => {
            try {
                const res = await fetch("/filters");
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();

        // Load user data
        const loadUserData = async () => {
            try {
                // First, try to use cached user data for immediate UI update
                const cachedUserData = getUserData();
                if (cachedUserData) {
                    setUserDataState(cachedUserData);
                    setFullName(cachedUserData.full_name || "");
                    setUsername(cachedUserData.username || "");
                    setEmail(cachedUserData.email || "");
                    setUserIsAdmin(cachedUserData.is_admin === true);
                    setLoading(false);
                }
                
                // OPTIONAL: Try to fetch fresh data from backend
                // If this fails, we just keep using cached data
                getCurrentUser()
                    .then(user => {
                        if (user) {
                            setUserDataState(user);
                            setFullName(user.full_name || "");
                            setUsername(user.username || "");
                            setEmail(user.email || "");
                            setUserIsAdmin(user.is_admin === true);
                        }
                    })
                    .catch(() => {
                        // Ignore errors - keep using cached data
                    });
            } catch (err) {
                console.error("Failed to load user data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadUserData();
        
        // Re-check when user logs in/out or subscription changes
        const handleUserChange = () => {
            console.log("AccountPage: User data changed, refreshing...");
            // Immediately update from localStorage (fastest)
            const cachedData = getUserData();
            if (cachedData?.subscription_plan) {
                const plan = cachedData.subscription_plan.toLowerCase();
                setSubscriptionPlan(plan);
                console.log("AccountPage: Immediately updated subscription plan to:", plan);
            }
            // Force immediate state update
            setRefreshKey(prev => prev + 1);
            // Then refresh user data from backend
            loadUserData(); // Refresh user data including subscription
        };
        
        // Also refresh when page becomes visible (user navigates back)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log("AccountPage: Page visible, refreshing user data...");
                loadUserData();
            }
        };
        
        window.addEventListener("userLoggedIn", handleUserChange);
        window.addEventListener("userLoggedOut", handleUserChange);
        window.addEventListener("premiumStatusChanged", handleUserChange); // Listen for subscription changes
        window.addEventListener("userProfileUpdated", handleUserChange); // Listen for profile updates
        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        return () => {
            window.removeEventListener("userLoggedIn", handleUserChange);
            window.removeEventListener("userLoggedOut", handleUserChange);
            window.removeEventListener("premiumStatusChanged", handleUserChange);
            window.removeEventListener("userProfileUpdated", handleUserChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    // Refresh user data when navigating to this page (location change)
    useEffect(() => {
        if (location.pathname === "/account") {
            const refreshUserData = async () => {
                console.log("AccountPage: Location changed to /account, refreshing user data...");
                try {
                    // Always get latest from localStorage first (immediate update)
                    const cachedUserData = getUserData();
                    console.log("AccountPage: Cached subscription_plan:", cachedUserData?.subscription_plan);
                    if (cachedUserData) {
                        setUserDataState(cachedUserData);
                        setFullName(cachedUserData.full_name || "");
                        setUsername(cachedUserData.username || "");
                        setEmail(cachedUserData.email || "");
                        setUserIsAdmin(cachedUserData.is_admin === true);
                        // Update subscription plan immediately from cached data
                        if (cachedUserData.subscription_plan) {
                            const plan = cachedUserData.subscription_plan.toLowerCase();
                            setSubscriptionPlan(plan);
                            console.log("AccountPage: Immediately set subscription plan from cache:", plan);
                        }
                    }
                    // Force immediate re-render
                    setRefreshKey(prev => prev + 1);
                    // Then fetch fresh from backend
                    const user = await getCurrentUser();
                    if (user) {
                        console.log("AccountPage: Backend subscription_plan:", user.subscription_plan);
                        setUserDataState(user);
                        setFullName(user.full_name || "");
                        setUsername(user.username || "");
                        setEmail(user.email || "");
                        setUserIsAdmin(user.is_admin === true);
                        // Update subscription plan from backend data
                        if (user.subscription_plan) {
                            const plan = user.subscription_plan.toLowerCase();
                            setSubscriptionPlan(plan);
                            console.log("AccountPage: Updated subscription plan from backend:", plan);
                        }
                        // Update localStorage with fresh data
                        setUserData(user);
                    }
                    setRefreshKey(prev => prev + 1); // Force re-render again after backend fetch
                } catch (err) {
                    console.error("Failed to refresh user data on navigation:", err);
                }
            };
            refreshUserData();
        }
    }, [location.pathname]); // Refresh when pathname changes (user navigates to this page)

    const handleUpdateName = async () => {
        if (!fullName.trim()) {
            setErrorMessage("Name cannot be empty");
            return;
        }
        
        setErrorMessage("");
        setSuccessMessage("");
        
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/auth/profile`, {
                method: "PUT",
                body: JSON.stringify({ full_name: fullName.trim() }),
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUserData(updatedUser);
                setUserDataState(updatedUser);
                setIsEditingName(false);
                setSuccessMessage("Name updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
                // Dispatch event to update Sidebar
                window.dispatchEvent(new Event("userProfileUpdated"));
                window.dispatchEvent(new Event("userLoggedIn")); // Refresh user data
            } else if (response.status === 401) {
                // Token is invalid - prompt user to login again
                setErrorMessage("Your session has expired. Please sign out and sign in again to continue.");
            } else {
                try {
                    const error = await response.json();
                    setErrorMessage(error.detail || "Failed to update name. Please try again.");
                } catch {
                    setErrorMessage("Failed to update name. Please try again.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("Failed to fetch")) {
                setErrorMessage("Cannot connect to server. Please check your connection.");
            } else if (err.message && err.message.includes("No authentication token")) {
                setErrorMessage("You are not logged in. Please sign in to continue.");
            } else {
                setErrorMessage(err.message || "Failed to update name. Please try again.");
            }
        }
    };

    const handleUpdateUsername = async () => {
        if (!username.trim()) {
            setErrorMessage("Username cannot be empty");
            return;
        }
        
        if (username.length < 3 || username.length > 20) {
            setErrorMessage("Username must be 3-20 characters");
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setErrorMessage("Username can only contain letters, numbers, and underscores");
            return;
        }
        
        setErrorMessage("");
        setSuccessMessage("");
        
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/auth/profile`, {
                method: "PUT",
                body: JSON.stringify({ username: username.trim() }),
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUserData(updatedUser);
                setUserDataState(updatedUser);
                setIsEditingUsername(false);
                setSuccessMessage("Username updated successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
                // Dispatch event to update Sidebar
                window.dispatchEvent(new Event("userProfileUpdated"));
                window.dispatchEvent(new Event("userLoggedIn")); // Refresh user data
            } else if (response.status === 401) {
                // Token is invalid - prompt user to login again
                setErrorMessage("Your session has expired. Please sign out and sign in again to continue.");
            } else {
                try {
                    const error = await response.json();
                    setErrorMessage(error.detail || "Failed to update username. Please try again.");
                } catch {
                    setErrorMessage("Failed to update username. Please try again.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("Failed to fetch")) {
                setErrorMessage("Cannot connect to server. Please check your connection.");
            } else if (err.message && err.message.includes("No authentication token")) {
                setErrorMessage("You are not logged in. Please sign in to continue.");
            } else {
                setErrorMessage(err.message || "Failed to update username. Please try again.");
            }
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrorMessage("All password fields are required");
            return;
        }
        
        if (newPassword.length < 8) {
            setErrorMessage("New password must be at least 8 characters");
            return;
        }
        
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            setErrorMessage("New password must contain uppercase, lowercase, and numbers");
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setErrorMessage("New passwords do not match");
            return;
        }
        
        setErrorMessage("");
        setSuccessMessage("");
        
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/auth/change-password`, {
                method: "PUT",
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });
            
            if (response.ok) {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setIsChangingPassword(false);
                setSuccessMessage("Password changed successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
            } else if (response.status === 401) {
                // Token is invalid - prompt user to login again
                setErrorMessage("Your session has expired. Please sign out and sign in again to continue.");
            } else {
                try {
                    const error = await response.json();
                    setErrorMessage(error.detail || "Failed to change password. Please try again.");
                } catch {
                    setErrorMessage("Failed to change password. Please try again.");
                }
            }
        } catch (err) {
            if (err.message && err.message.includes("Failed to fetch")) {
                setErrorMessage("Cannot connect to server. Please check your connection.");
            } else if (err.message && err.message.includes("No authentication token")) {
                setErrorMessage("You are not logged in. Please sign in to continue.");
            } else {
                setErrorMessage(err.message || "Failed to change password. Please try again.");
            }
        }
    };

    // Helper functions - MUST be defined before use
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
            });
        } catch {
            return "Invalid date";
        }
    };

    const isSubscriptionActive = () => {
        // Check both userData state and localStorage for subscription_end_date
        const cachedData = getUserData();
        const subscriptionEndDate = userData?.subscription_end_date || cachedData?.subscription_end_date;
        if (!subscriptionEndDate) return false;
        const endDate = new Date(subscriptionEndDate);
        return endDate > new Date();
    };

    const getDaysUntilExpiry = () => {
        // Check both userData state and localStorage for subscription_end_date
        const cachedData = getUserData();
        const subscriptionEndDate = userData?.subscription_end_date || cachedData?.subscription_end_date;
        if (!subscriptionEndDate) return null;
        const endDate = new Date(subscriptionEndDate);
        const today = new Date();
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Update subscription plan whenever userData, refreshKey, or location changes
    // MUST be before any conditional returns (Rules of Hooks)
    useEffect(() => {
        const updateSubscriptionPlan = () => {
            // CRITICAL: Check localStorage FIRST (updated immediately when subscription changes)
            const cachedData = getUserData();
            if (cachedData?.subscription_plan) {
                const plan = cachedData.subscription_plan.toLowerCase();
                console.log("AccountPage: useEffect - Subscription plan from localStorage:", plan);
                setSubscriptionPlan(plan);
                return;
            }
            // Fallback to userData state
            if (userData?.subscription_plan) {
                const plan = userData.subscription_plan.toLowerCase();
                console.log("AccountPage: useEffect - Subscription plan from state:", plan);
                setSubscriptionPlan(plan);
                return;
            }
            console.log("AccountPage: useEffect - No subscription plan found, defaulting to free");
            setSubscriptionPlan("free");
        };
        
        updateSubscriptionPlan();
    }, [userData, refreshKey, location.pathname]); // Re-run when userData, refreshKey, or location changes

    // Calculate derived values - MUST be before conditional returns
    // ALWAYS read from localStorage first for most up-to-date value (updated immediately by SubscriptionPage)
    // This ensures we always show the latest subscription status, even if state hasn't updated yet
    // We read directly from localStorage here so we don't need to wait for state updates
    const cachedDataForRender = getUserData();
    const renderSubscriptionPlan = (cachedDataForRender?.subscription_plan || subscriptionPlan || "free").toLowerCase();
    const isPremium = renderSubscriptionPlan === "premium";
    
    // Check subscription active status directly from localStorage (most up-to-date)
    const subscriptionEndDateForActive = cachedDataForRender?.subscription_end_date || userData?.subscription_end_date;
    const isActive = subscriptionEndDateForActive ? new Date(subscriptionEndDateForActive) > new Date() : false;
    
    const daysUntilExpiry = getDaysUntilExpiry();
    
    // Debug log
    console.log("AccountPage: Render - subscriptionPlan state:", subscriptionPlan, "cachedData subscription_plan:", cachedDataForRender?.subscription_plan, "renderSubscriptionPlan:", renderSubscriptionPlan, "isPremium:", isPremium, "isActive:", isActive, "subscriptionEndDate:", subscriptionEndDateForActive, "refreshKey:", refreshKey);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <p className="text-gray-600">Loading...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
            
            <main className="flex-1 ml-64">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Back</span>
                        </button>
                        
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            👤 My Account
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Manage your profile, subscription, and account settings
                        </p>

                        {successMessage && (
                            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                                {successMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {errorMessage}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Profile Information */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            disabled
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name
                                        </label>
                                        {isEditingName ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter your full name"
                                                />
                                                <button
                                                    onClick={handleUpdateName}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingName(false);
                                                        setFullName(userData?.full_name || "");
                                                    }}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={fullName || "Not set"}
                                                    disabled
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                                />
                                                <button
                                                    onClick={() => setIsEditingName(true)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Username
                                        </label>
                                        {isEditingUsername ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Enter username"
                                                />
                                                <button
                                                    onClick={handleUpdateUsername}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingUsername(false);
                                                        setUsername(userData?.username || "");
                                                    }}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={username || "Not set"}
                                                    disabled
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                                />
                                                <button
                                                    onClick={() => setIsEditingUsername(true)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Change Password */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
                                {isChangingPassword ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Password
                                            </label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Must be at least 8 characters with uppercase, lowercase, and numbers
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Confirm New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleChangePassword}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Change Password
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsChangingPassword(false);
                                                    setCurrentPassword("");
                                                    setNewPassword("");
                                                    setConfirmPassword("");
                                                }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsChangingPassword(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Change Password
                                    </button>
                                )}
                            </div>

                            {/* Admin Section */}
                            {userIsAdmin && (
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Tools</h2>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                            🔧 Admin Account
                                        </span>
                                        <p className="text-sm text-gray-600">
                                            You have full admin access to manage users, subscriptions, and system settings.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => navigate("/admin")}
                                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                        >
                                            Open Admin Panel
                                        </button>
                                        <button
                                            onClick={() => navigate("/admin/subscription-management")}
                                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            Manage Subscription Plans
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

