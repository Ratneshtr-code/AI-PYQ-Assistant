// src/SettingsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import { getUIMode, setUIMode, UI_MODES, isAdminMode } from "./config/uiConfig";

export default function SettingsPage() {
    const navigate = useNavigate();
    const [examsList, setExamsList] = useState([]);
    const [uiMode, setUiModeState] = useState(getUIMode());
    const [allowModeSwitching, setAllowModeSwitching] = useState(false);
    const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });

    useEffect(() => {
        // Fetch UI config
        const fetchUIConfig = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/ui-config");
                const data = await res.json();
                setAllowModeSwitching(data.allow_mode_switching || false);
            } catch (err) {
                console.error("Failed to fetch UI config:", err);
            }
        };
        fetchUIConfig();

        // Fetch exams list for sidebar
        const fetchExams = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/filters");
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();
    }, []);

    const handleModeToggle = () => {
        if (!allowModeSwitching) {
            // Validate inputs
            if (!adminCredentials.username || !adminCredentials.password) {
                alert("Please enter both username and password");
                return;
            }

            // Try admin login
            fetch("http://127.0.0.1:8000/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adminCredentials),
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    console.log("Admin login response:", data);
                    if (data.success) {
                        // Switch to admin mode
                        setUIMode(UI_MODES.ADMIN);
                        setUiModeState(UI_MODES.ADMIN);
                        window.dispatchEvent(new Event("uiModeChanged"));
                        alert("Admin mode activated successfully!");
                        // Clear credentials for security
                        setAdminCredentials({ username: "", password: "" });
                    } else {
                        alert(`Login failed: ${data.message || "Invalid credentials"}`);
                    }
                })
                .catch((error) => {
                    console.error("Admin login error:", error);
                    alert(`Admin login failed: ${error.message}. Make sure the backend server is running and config.yaml has been updated.`);
                });
        } else {
            const newMode = uiMode === UI_MODES.ADMIN ? UI_MODES.USER : UI_MODES.ADMIN;
            setUIMode(newMode);
            setUiModeState(newMode);
            window.dispatchEvent(new Event("uiModeChanged"));
        }
    };

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
                            {/* Admin Mode Section */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Mode</h2>
                                
                                {allowModeSwitching ? (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600">
                                            Mode switching is enabled. You can toggle between User and Admin mode.
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-700">Current Mode:</span>
                                            <button
                                                onClick={handleModeToggle}
                                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                                    isAdminMode()
                                                        ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                            >
                                                {isAdminMode() ? "🔧 Admin" : "👤 User"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-600">
                                                Mode switching is disabled. Use admin credentials to access Admin mode.
                                            </p>
                                            {isAdminMode() && (
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                                    🔧 Admin Mode Active
                                                </span>
                                            )}
                                        </div>
                                        {!isAdminMode() ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Admin Username
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={adminCredentials.username}
                                                        onChange={(e) =>
                                                            setAdminCredentials({
                                                                ...adminCredentials,
                                                                username: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Enter admin username (default: admin)"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Admin Password
                                                    </label>
                                                    <input
                                                        type="password"
                                                        value={adminCredentials.password}
                                                        onChange={(e) =>
                                                            setAdminCredentials({
                                                                ...adminCredentials,
                                                                password: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Enter admin password"
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        onKeyPress={(e) => {
                                                            if (e.key === "Enter") {
                                                                handleModeToggle();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleModeToggle}
                                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                                >
                                                    Login as Admin
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                                <p className="text-sm text-purple-800 mb-3">
                                                    You are currently in Admin mode. Debug features are enabled.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setUIMode(UI_MODES.USER);
                                                        setUiModeState(UI_MODES.USER);
                                                        window.dispatchEvent(new Event("uiModeChanged"));
                                                    }}
                                                    className="px-4 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                                                >
                                                    Switch to User Mode
                                                </button>
                                            </div>
                                        )}
                                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-xs text-yellow-800">
                                                <strong>Note:</strong> After changing config.yaml, you must restart the backend server for changes to take effect.
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                Current config: username="admin", password="123" (from config.yaml)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

