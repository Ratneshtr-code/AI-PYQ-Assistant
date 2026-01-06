// src/HomePage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function HomePage() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

    useEffect(() => {
        // Fetch exam filters
        const fetchExams = async () => {
            try {
                const url = buildApiUrl("filters");
                console.log("🔍 [Home] Fetching exams from:", url);
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                console.log("📡 [Home] Response status:", res.status, res.statusText);
                
                if (!res.ok) {
                    const text = await res.text();
                    console.error("❌ [Home] Failed to fetch exams. Status:", res.status, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("❌ [Home] Response is not JSON. Content-Type:", contentType, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const data = await res.json();
                console.log("✅ [Home] Exams data received:", data);
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("❌ [Home] Error fetching exams:", err);
                setExamsList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const handleExamClick = (examName) => {
        navigate(`/home/${encodeURIComponent(examName)}`);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar 
                exam={""} 
                setExam={() => {}} 
                examsList={examsList}
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "md:ml-16" : "md:ml-64"
                }`}
            >
                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-8"
                    >
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                            🏠 Home
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            {language === "hi"
                                ? "अपनी परीक्षा चुनें और शुरू करें"
                                : "Select your exam and get started"}
                        </p>
                    </motion.div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                <p className="text-gray-600 text-sm">
                                    {language === "hi" ? "परीक्षाएं लोड हो रही हैं..." : "Loading exams..."}
                                </p>
                            </div>
                        </div>
                    ) : examsList.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 text-center">
                            <p className="text-gray-500 text-lg">
                                {language === "hi" ? "कोई परीक्षा उपलब्ध नहीं है" : "No exams available"}
                            </p>
                        </div>
                    ) : (
                        /* Premium Exam Cards Grid */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
                            {examsList.map((exam, index) => (
                                <motion.div
                                    key={exam}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05, duration: 0.3 }}
                                    onClick={() => handleExamClick(exam)}
                                    className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-4 md:p-6 flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px]"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Content */}
                                    <div className="relative z-10 text-center w-full">
                                        {/* Exam Icon/Initial */}
                                        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md group-hover:shadow-lg transition-shadow">
                                            {exam.substring(0, 2).toUpperCase()}
                                        </div>
                                        
                                        {/* Exam Name */}
                                        <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                            {exam}
                                        </h3>
                                        
                                        {/* Arrow Indicator */}
                                        <div className="mt-2 flex items-center justify-center text-indigo-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span>{language === "hi" ? "खोलें" : "Explore"}</span>
                                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

