// src/CrossExamInsightsPage.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import SubjectCards from "./components/SubjectCards";
import CrossExamSubjectAnalysis from "./components/CrossExamSubjectAnalysis";
import CrossExamHotTopics from "./components/CrossExamHotTopics";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function CrossExamInsightsPage() {
    const { language } = useLanguage(); // Get language from context
    const isMobile = useMobileDetection();
    const [exams, setExams] = useState([]);
    const [examsList, setExamsList] = useState([]);
    const [yearFrom, setYearFrom] = useState(null);
    const [yearTo, setYearTo] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [viewMode, setViewMode] = useState("cards"); // "cards" or "content"
    const [activeSubPage, setActiveSubPage] = useState(null);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [maxExams, setMaxExams] = useState(3); // Default to 3, will be updated from config
    const [filterPaneExpanded, setFilterPaneExpanded] = useState(false); // Collapsed by default on mobile

    useEffect(() => {
        // Fetch UI config for max exam comparison
        const fetchUIConfig = async () => {
            try {
                const res = await fetch(buildApiUrl("ui-config"));
                const data = await res.json();
                if (data.max_exam_comparison) {
                    setMaxExams(data.max_exam_comparison);
                }
            } catch (err) {
                console.error("Failed to fetch UI config:", err);
                // Keep default value of 3 if fetch fails
            }
        };
        fetchUIConfig();

        // Fetch exam filters
        const fetchExams = async () => {
            try {
                const url = buildApiUrl("filters");
                console.log("🔍 [Cross-Exam] Fetching exams from:", url);
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                console.log("📡 [Cross-Exam] Response status:", res.status, res.statusText);
                
                if (!res.ok) {
                    const text = await res.text();
                    console.error("❌ [Cross-Exam] Failed to fetch exams. Status:", res.status, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("❌ [Cross-Exam] Response is not JSON. Content-Type:", contentType, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const data = await res.json();
                console.log("✅ [Cross-Exam] Exams data received:", data);
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("❌ [Cross-Exam] Error fetching exams:", err);
                setExamsList([]);
            }
        };
        fetchExams();

        // Fetch available years
        const fetchYears = async () => {
            try {
                const url = buildApiUrl("dashboard/filters");
                console.log("🔍 [Cross-Exam] Fetching years from:", url);
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                console.log("📡 [Cross-Exam] Years response status:", res.status, res.statusText);
                
                if (!res.ok) {
                    const text = await res.text();
                    console.error("❌ [Cross-Exam] Failed to fetch years. Status:", res.status, "Response:", text.substring(0, 200));
                    setAvailableYears([]);
                    return;
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("❌ [Cross-Exam] Response is not JSON. Content-Type:", contentType, "Response:", text.substring(0, 200));
                    setAvailableYears([]);
                    return;
                }
                
                const data = await res.json();
                console.log("✅ [Cross-Exam] Years data received:", data);
                if (data.years && data.years.length > 0) {
                    setAvailableYears(data.years);
                    if (!yearFrom && data.years[0]) {
                        setYearFrom(data.years[0]);
                    }
                    if (!yearTo && data.years[data.years.length - 1]) {
                        setYearTo(data.years[data.years.length - 1]);
                    }
                } else {
                    setAvailableYears([]);
                }
            } catch (err) {
                console.error("❌ [Cross-Exam] Error fetching years:", err);
                setAvailableYears([]);
            }
        };
        fetchYears();
    }, []);

    const handleAddExam = (exam) => {
        if (exams.length >= maxExams) {
            const message = language === "hi" 
                ? `अधिकतम ${maxExams} परीक्षाएं अनुमत हैं। कृपया पहले एक हटाएं।`
                : `Maximum ${maxExams} exams allowed. Please remove one first.`;
            alert(message);
            return;
        }
        if (!exams.includes(exam)) {
            setExams([...exams, exam]);
        }
    };

    const handleRemoveExam = (exam) => {
        setExams(exams.filter((e) => e !== exam));
        if (selectedSubject && exams.length === 1) {
            setSelectedSubject(null);
        }
    };

    const handleCardClick = (subPageId) => {
        setActiveSubPage(subPageId);
        setViewMode("content");
    };

    const handleBackToCards = () => {
        setViewMode("cards");
        setActiveSubPage(null);
    };

    const handleFilterPaneToggle = () => {
        setFilterPaneExpanded(prev => !prev);
    };

    const renderContent = () => {
        if (!activeSubPage) return null;
        
        switch (activeSubPage) {
            case "subject-cards":
                return (
                    <SubjectCards
                        exams={exams}
                        yearFrom={yearFrom}
                        yearTo={yearTo}
                        onSubjectClick={setSelectedSubject}
                    />
                );
            case "subject-analysis":
                return (
                    <CrossExamSubjectAnalysis
                        exams={exams}
                        yearFrom={yearFrom}
                        yearTo={yearTo}
                        selectedSubject={selectedSubject}
                        onSubjectSelect={setSelectedSubject}
                    />
                );
            case "hot-topics":
                return <CrossExamHotTopics exams={exams} yearFrom={yearFrom} yearTo={yearTo} />;
            default:
                return null;
        }
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
                {/* Filter Bar - Only show in content view, not in cards view */}
                {viewMode === "content" && (
                    <div className="w-full relative z-10">
                        <FilterBar
                            exams={exams}
                            onAddExam={handleAddExam}
                            onRemoveExam={handleRemoveExam}
                            maxExams={maxExams}
                            examsList={examsList}
                            yearFrom={yearFrom}
                            setYearFrom={setYearFrom}
                            yearTo={yearTo}
                            setYearTo={setYearTo}
                            availableYears={availableYears}
                            showSubject={false}
                            showExam={true}
                            multipleExamsMode={true}
                            isMobile={isMobile}
                            isExpanded={(activeSubPage === "subject-cards" || activeSubPage === "subject-analysis" || activeSubPage === "hot-topics") ? filterPaneExpanded : true}
                            onToggleExpand={(activeSubPage === "subject-cards" || activeSubPage === "subject-analysis" || activeSubPage === "hot-topics") ? handleFilterPaneToggle : undefined}
                        />
                    </div>
                )}

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 relative z-0">
                    <AnimatePresence mode="wait">
                        {viewMode === "cards" ? (
                            <motion.div
                                key="cards"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Header */}
                                <div className="mb-8">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                        🔍 Cross-Exam Insights
                                    </h1>
                                    <p className="text-sm md:text-base text-gray-600">
                                        {language === "hi"
                                            ? "व्यापक एनालिटिक्स के साथ विभिन्न परीक्षाओं में विषयों और विषयों की तुलना करें"
                                            : "Compare subjects and topics across different exams with comprehensive analytics"}
                                    </p>
                                </div>

                                {/* Premium Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
                                    {/* Subject Comparison Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                        onClick={() => handleCardClick("subject-cards")}
                                        className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-4 md:p-6 lg:p-8"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10">
                                            <div className="text-5xl mb-4">📋</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                Subject Comparison
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {language === "hi"
                                                    ? "विज़ुअल तुलना कार्ड के साथ कई परीक्षाओं में विषय वितरण और प्रदर्शन की तुलना करें"
                                                    : "Compare subject distribution and performance across multiple exams with visual comparison cards"}
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-6 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>{language === "hi" ? "अन्वेषण करें" : "Explore"}</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Subject & Topic Analysis Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        onClick={() => handleCardClick("subject-analysis")}
                                        className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-4 md:p-6 lg:p-8"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10">
                                            <div className="text-5xl mb-4">📊</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                Subject & Topic Analysis
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {language === "hi"
                                                    ? "व्यापक विश्लेषण के लिए चयनित परीक्षाओं में विस्तृत विषय और विषय वितरण पैटर्न की तुलना करें"
                                                    : "Compare detailed subject and topic distribution patterns across selected exams for comprehensive insights"}
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-6 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>{language === "hi" ? "अन्वेषण करें" : "Explore"}</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Hot Topics Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        onClick={() => handleCardClick("hot-topics")}
                                        className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-4 md:p-6 lg:p-8"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10">
                                            <div className="text-5xl mb-4">🔥</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                Hot Topics
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {language === "hi"
                                                    ? "अपने अध्ययन फोकस को प्राथमिकता देने के लिए कई परीक्षाओं में ट्रेंडिंग और अक्सर पूछे जाने वाले विषयों की पहचान करें"
                                                    : "Identify trending and frequently asked topics across multiple exams to prioritize your study focus"}
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-6 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>{language === "hi" ? "अन्वेषण करें" : "Explore"}</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Info Section */}
                                {exams.length === 0 && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 md:p-6 text-center shadow-sm">
                                        <p className="text-blue-800 font-medium">
                                            {language === "hi"
                                                ? "👆 विश्लेषण की तुलना शुरू करने के लिए फ़िल्टर बार से परीक्षाएं जोड़ें"
                                                : "👆 Add exams from the filter bar to start comparing insights"}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Header with Back Button */}
                                <div className="mb-6 flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleBackToCards}
                                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shadow-sm"
                                            title="Back to cards"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <div>
                                            {(() => {
                                                const pageInfo = {
                                                    "subject-cards": {
                                                        title: "📋 Subject Comparison",
                                                        description: {
                                                            en: "Compare subject distribution and performance across multiple exams with visual comparison cards",
                                                            hi: "विज़ुअल तुलना कार्ड के साथ कई परीक्षाओं में विषय वितरण और प्रदर्शन की तुलना करें"
                                                        }
                                                    },
                                                    "subject-analysis": {
                                                        title: "📊 Subject & Topic Analysis",
                                                        description: {
                                                            en: "Compare detailed subject and topic distribution patterns across selected exams for comprehensive insights",
                                                            hi: "व्यापक विश्लेषण के लिए चयनित परीक्षाओं में विस्तृत विषय और विषय वितरण पैटर्न की तुलना करें"
                                                        }
                                                    },
                                                    "hot-topics": {
                                                        title: "🔥 Hot Topics Across Exams",
                                                        description: {
                                                            en: "Identify trending and frequently asked topics across multiple exams to prioritize your study focus",
                                                            hi: "अपने अध्ययन फोकस को प्राथमिकता देने के लिए कई परीक्षाओं में ट्रेंडिंग और अक्सर पूछे जाने वाले विषयों की पहचान करें"
                                                        }
                                                    }
                                                };
                                                const info = pageInfo[activeSubPage] || {
                                                    title: "🔍 Cross-Exam Insights",
                                                    description: {
                                                        en: "Compare subjects and topics across different exams",
                                                        hi: "विभिन्न परीक्षाओं में विषयों और विषयों की तुलना करें"
                                                    }
                                                };
                                                const description = info.description[language] || info.description.en;
                                                return (
                                                    <>
                                                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                                            {info.title}
                                                        </h1>
                                                        <p className="text-xs md:text-sm text-gray-600">
                                                            {description}
                                                        </p>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Content based on active sub-page */}
                                <motion.div
                                    key={activeSubPage}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {renderContent()}
                                </motion.div>

                                {/* Info Section */}
                                {exams.length === 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 text-center">
                                        <p className="text-blue-800">
                                            {language === "hi"
                                                ? "👆 विश्लेषण की तुलना शुरू करने के लिए फ़िल्टर बार से परीक्षाएं जोड़ें"
                                                : "👆 Add exams from the filter bar to start comparing insights"}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
