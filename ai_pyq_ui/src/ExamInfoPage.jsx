// src/ExamInfoPage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ExamInfoPage() {
    const { examName } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [activeTab, setActiveTab] = useState("syllabus");
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    
    const decodedExamName = examName ? decodeURIComponent(examName) : "";

    const tabs = [
        {
            id: "syllabus",
            label: language === "hi" ? "सिलेबस" : "Syllabus",
            icon: "📋"
        },
        {
            id: "pattern",
            label: language === "hi" ? "पैटर्न" : "Pattern",
            icon: "📊"
        },
        {
            id: "other",
            label: language === "hi" ? "अन्य" : "Other",
            icon: "📄"
        }
    ];

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar 
                exam={decodedExamName} 
                setExam={() => {}} 
                examsList={[]}
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
                    {/* Header with Back Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 flex items-start justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/home/${encodeURIComponent(decodedExamName)}`)}
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shadow-sm"
                                title="Back to Exam Page"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                    {decodedExamName} {language === "hi" ? "जानकारी" : "Info"}
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600">
                                    {language === "hi"
                                        ? "परीक्षा की विस्तृत जानकारी देखें"
                                        : "View detailed exam information"}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Tab Navigation */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="flex border-b border-gray-200 bg-gray-100">
                            {tabs.map((tab) => (
                                <motion.button
                                    key={tab.id}
                                    whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 px-4 md:px-8 py-4 text-left transition-all relative ${
                                        activeTab === tab.id
                                            ? "bg-blue-50"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTabIndicator"
                                            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{tab.icon}</span>
                                        <span className={`text-sm md:text-base font-semibold ${
                                            activeTab === tab.id ? "text-blue-700" : "text-gray-700"
                                        }`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 md:p-8 min-h-[400px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center justify-center h-full"
                                >
                                    <div className="text-center">
                                        <div className="text-6xl mb-4 opacity-20">
                                            {tabs.find(t => t.id === activeTab)?.icon}
                                        </div>
                                        <p className="text-xl font-semibold text-gray-500">
                                            {language === "hi" ? "जल्द ही आ रहा है" : "Coming soon"}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-2">
                                            {language === "hi"
                                                ? "यह सामग्री जल्द ही उपलब्ध होगी"
                                                : "This content will be available soon"}
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

