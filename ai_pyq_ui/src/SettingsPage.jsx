// src/SettingsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import { getCurrentUser, isAuthenticated, getUserData } from "./utils/auth";

export default function SettingsPage() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [userIsAdmin, setUserIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Note: ProtectedRoute already handles authentication check and redirect
        // We can safely assume user is authenticated when this component renders
        
        // Fetch exams list for sidebar
        const fetchExams = async () => {
            try {
                const res = await fetch(buildApiUrl("filters"));
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();

        // Check if current user is admin - always fetch fresh data
        const checkAdmin = async () => {
            try {
                // First, try to use cached user data for immediate UI update
                const cachedUserData = getUserData();
                if (cachedUserData) {
                    setUserIsAdmin(cachedUserData.is_admin === true);
                    setLoading(false); // Show UI immediately with cached data
                }
                
                // Then fetch fresh data from backend (don't block UI)
                try {
                    const user = await getCurrentUser();
                    if (user) {
                        // Admin status comes from database, not from any "mode"
                        setUserIsAdmin(user.is_admin === true);
                    } else {
                        // If getCurrentUser returns null, keep using cached data
                        // Don't clear admin status - token might be temporarily invalid
                        console.warn("getCurrentUser returned null, using cached data");
                    }
                } catch (apiError) {
                    // API call failed - keep using cached data
                    console.warn("Failed to fetch fresh user data, using cached:", apiError);
                    // Don't clear admin status on API errors
                }
            } catch (err) {
                console.error("Failed to check admin status:", err);
                // On error, try to use cached data
                const cachedData = getUserData();
                setUserIsAdmin(cachedData?.is_admin === true || false);
            } finally {
                setLoading(false);
            }
        };
        checkAdmin();
        
        // Re-check admin status when user logs in/out
        const handleUserChange = () => {
            checkAdmin();
        };
        window.addEventListener("userLoggedIn", handleUserChange);
        window.addEventListener("userLoggedOut", handleUserChange);
        
        return () => {
            window.removeEventListener("userLoggedIn", handleUserChange);
            window.removeEventListener("userLoggedOut", handleUserChange);
        };
    }, []);


    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar exam="" setExam={() => {}} examsList={examsList} onOpenSecondarySidebar={() => {}} />
            
            <main className="flex-1 ml-64">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            ⚙️ Settings
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Manage your account and preferences
                        </p>

                        <div className="space-y-6">
                            {/* Admin Status Section */}
                            {loading ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <p className="text-sm text-gray-600">Loading...</p>
                                </div>
                            ) : userIsAdmin ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Status</h2>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                            🔧 Admin Account
                                        </span>
                                        <p className="text-sm text-gray-600">
                                            You have full admin access to manage users, subscriptions, and system settings.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Access</h2>
                                    <p className="text-sm text-gray-600 mb-4">
                                        You are currently logged in as a regular user. Admin access is granted to users with admin privileges in the database.
                                    </p>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-900 mb-2">To get admin access:</p>
                                        <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                                            <li>Run: <code className="bg-white px-2 py-1 rounded">python app/create_admin.py</code></li>
                                            <li>Enter your email to promote your account to admin</li>
                                            <li>Refresh this page after promotion</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {/* Account Section */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={localStorage.getItem("userEmail") || ""}
                                            disabled
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={localStorage.getItem("userName") || ""}
                                            disabled
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subscription Section */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-700 font-medium">
                                            {localStorage.getItem("hasPremium") === "true" ? "Premium" : "Free"}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {localStorage.getItem("hasPremium") === "true"
                                                ? "Active subscription"
                                                : "Upgrade to unlock premium features"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate("/subscription")}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {localStorage.getItem("hasPremium") === "true" ? "Manage" : "Upgrade"}
                                    </button>
                                </div>
                            </div>

                            {/* Admin Panel Section */}
                            {userIsAdmin ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Tools</h2>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Access the admin panel to manage users, subscriptions, and system settings.
                                    </p>
                                    <button
                                        onClick={() => navigate("/admin")}
                                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Open Admin Panel
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Access</h2>
                                    <p className="text-sm text-gray-600 mb-4">
                                        To access the admin panel, you need to be logged in as an admin user. 
                                        Admin users are created through the database.
                                    </p>
                                    <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                                        <p className="text-sm font-medium text-gray-900 mb-2">Quick Setup:</p>
                                        <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                                            <li>Run: <code className="bg-gray-100 px-2 py-1 rounded">python app/create_admin.py</code></li>
                                            <li>Follow the prompts to create your first admin user</li>
                                            <li>Login with the admin credentials</li>
                                            <li>Access admin panel from here or navigate to <code className="bg-gray-100 px-2 py-1 rounded">/admin</code></li>
                                        </ol>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        <strong>Note:</strong> Admin panel requires a database admin user. 
                                        Use the script above to create your first admin account.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

