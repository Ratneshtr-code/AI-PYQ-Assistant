// src/ExamHottestTopicsPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import HottestTopicsByExam from "./components/HottestTopicsByExam";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ExamHottestTopicsPage() {
    const { examName } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [yearFrom, setYearFrom] = useState(null);
    const [yearTo, setYearTo] = useState(null);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [filterPaneExpanded, setFilterPaneExpanded] = useState(false);
    
    const decodedExamName = examName ? decodeURIComponent(examName) : "";

    useEffect(() => {
        // Fetch exam filters
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

        // Fetch available years
        const fetchYears = async () => {
            try {
                const url = buildApiUrl("dashboard/filters");
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.years && data.years.length > 0) {
                        setAvailableYears(data.years);
                        if (!yearFrom && data.years[0]) {
                            setYearFrom(data.years[0]);
                        }
                        if (!yearTo && data.years[data.years.length - 1]) {
                            setYearTo(data.years[data.years.length - 1]);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching years:", err);
            }
        };
        fetchYears();
    }, []);

    const handleFilterPaneToggle = () => {
        setFilterPaneExpanded(prev => !prev);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar
                exam={decodedExamName}
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
                {/* Filter Bar */}
                <div className="w-full relative z-10">
                    <FilterBar
                        exam={decodedExamName}
                        setExam={() => {}}
                        examsList={examsList}
                        yearFrom={yearFrom}
                        setYearFrom={setYearFrom}
                        yearTo={yearTo}
                        setYearTo={setYearTo}
                        availableYears={availableYears}
                        showSubject={false}
                        showExam={false}
                        isMobile={isMobile}
                        isExpanded={filterPaneExpanded}
                        onToggleExpand={handleFilterPaneToggle}
                    />
                </div>

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
                                    {decodedExamName} {language === "hi" ? "सबसे गर्म विषय" : "Hottest Topics"}
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600">
                                    {language === "hi"
                                        ? "सबसे अधिक पूछे जाने वाले विषय"
                                        : "Most frequently asked topics"}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hottest Topics Component */}
                    {!decodedExamName ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                            <p className="text-gray-500 text-center py-8">
                                {language === "hi" ? "कृपया एक परीक्षा चुनें" : "Please select an exam"}
                            </p>
                        </div>
                    ) : (
                        <HottestTopicsByExam exam={decodedExamName} yearFrom={yearFrom} yearTo={yearTo} />
                    )}
                </div>
            </main>
        </div>
    );
}

