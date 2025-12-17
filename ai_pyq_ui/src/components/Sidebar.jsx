// src/components/Sidebar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getUIMode, setUIMode, UI_MODES, isAdminMode } from "../config/uiConfig";

export default function Sidebar({ exam, setExam, examsList }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [uiMode, setUiModeState] = useState(getUIMode());
    const [allowModeSwitching, setAllowModeSwitching] = useState(false);

    const isDashboard = location.pathname.includes("exam-dashboard");
    const isSearchPage =
        location.pathname.includes("search") || location.pathname === "/";

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

    return (
        <aside
            className="fixed top-0 left-0 z-40 h-full w-64 bg-white shadow-md border-r border-gray-200 p-6 flex flex-col justify-between"
        >
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                    {isDashboard ? "Exam Dashboard" : "PYQ Assistant"}
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
                <div className="space-y-2">
                    <button
                        onClick={() => navigate("/")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition ${isSearchPage
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        🧠 PYQ Assistant
                    </button>

                    <button
                        onClick={() => navigate("/exam-dashboard")}
                        className={`w-full text-left py-2 px-3 rounded-lg transition ${isDashboard
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        📊 Exam Dashboard
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 space-y-2">
                {/* Admin Mode Toggle - Only show if allowed by backend config */}
                {allowModeSwitching && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Mode:</span>
                        <button
                            onClick={toggleAdminMode}
                            className={`px-2 py-1 rounded text-xs font-medium transition ${
                                isAdminMode()
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            title="Toggle Admin Mode (shows debug IDs)"
                        >
                            {isAdminMode() ? "🔧 Admin" : "👤 User"}
                        </button>
                    </div>
                )}
                {/* Show current mode (read-only) if mode switching is disabled */}
                {!allowModeSwitching && isAdminMode() && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Mode:</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            🔧 Admin
                        </span>
                    </div>
                )}
                <button
                    onClick={() => navigate("/login")}
                    className="w-full text-sm text-gray-600 hover:text-gray-800 transition"
                >
                    👤 Sign In / Sign Up
                </button>
            </div>
        </aside>
    );
}
