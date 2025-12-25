// src/CrossExamInsightsPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import SecondarySidebar from "./components/SecondarySidebar";
import FilterBar from "./components/FilterBar";
import SubjectCards from "./components/SubjectCards";
import CrossExamSubjectAnalysis from "./components/CrossExamSubjectAnalysis";
import CrossExamHotTopics from "./components/CrossExamHotTopics";

export default function CrossExamInsightsPage() {
    const [exams, setExams] = useState([]);
    const [examsList, setExamsList] = useState([]);
    const [yearFrom, setYearFrom] = useState(null);
    const [yearTo, setYearTo] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [activeSubPage, setActiveSubPage] = useState("subject-cards");
    const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(true);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [maxExams, setMaxExams] = useState(3); // Default to 3, will be updated from config

    useEffect(() => {
        // Fetch UI config for max exam comparison
        const fetchUIConfig = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/ui-config");
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
                const res = await fetch("http://127.0.0.1:8000/filters");
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
                const res = await fetch("http://127.0.0.1:8000/dashboard/filters");
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
            } catch (err) {
                console.error("Failed to fetch years:", err);
            }
        };
        fetchYears();
    }, []);

    const handleAddExam = (exam) => {
        if (exams.length >= maxExams) {
            alert(`Maximum ${maxExams} exams allowed. Please remove one first.`);
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

    const renderContent = () => {
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
                return (
                    <SubjectCards
                        exams={exams}
                        yearFrom={yearFrom}
                        yearTo={yearTo}
                        onSubjectClick={setSelectedSubject}
                    />
                );
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar 
                exam={""} 
                setExam={() => {}} 
                examsList={examsList}
                onOpenSecondarySidebar={() => setSecondarySidebarOpen(!secondarySidebarOpen)}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                    // When Primary Sidebar collapses, also close Secondary Sidebar
                    if (isCollapsed) {
                        setSecondarySidebarOpen(false);
                    }
                }}
            />

            {/* Secondary Sidebar */}
            <SecondarySidebar
                isOpen={secondarySidebarOpen}
                onClose={() => setSecondarySidebarOpen(false)}
                type="cross-exam"
                activeSubPage={activeSubPage}
                onSubPageChange={setActiveSubPage}
            />

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "ml-16" : secondarySidebarOpen ? "ml-64 lg:ml-[496px]" : "ml-64"
                }`}
            >
                {/* Filter Bar - Now part of page content, not sticky */}
                <div className="w-full relative z-10">
                    {/* Hamburger Button - Positioned in the middle between Primary Sidebar and Filter Pane */}
                    {!primarySidebarCollapsed && !secondarySidebarOpen && (
                        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 relative">
                            <button
                                onClick={() => setSecondarySidebarOpen(true)}
                                className="absolute -left-6 md:-left-8 top-4 p-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 shadow-sm transition-colors flex items-center justify-center z-10"
                                title="Open sub-pages navigation"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
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
                    />
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4 relative z-0">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                                {(() => {
                                    const pageInfo = {
                                        "subject-cards": {
                                            title: "📋 Subject Comparison",
                                            description: "Compare subject distribution and performance across multiple exams with visual comparison cards"
                                        },
                                        "subject-analysis": {
                                            title: "📊 Subject & Topic Analysis",
                                            description: "Compare detailed subject and topic distribution patterns across selected exams for comprehensive insights"
                                        },
                                        "hot-topics": {
                                            title: "🔥 Hot Topics Across Exams",
                                            description: "Identify trending and frequently asked topics across multiple exams to prioritize your study focus"
                                        }
                                    };
                                    const info = pageInfo[activeSubPage] || {
                                        title: "🔍 Cross-Exam Insights",
                                        description: "Compare subjects and topics across different exams"
                                    };
                                    return (
                                        <>
                                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                                {info.title}
                                            </h1>
                                            <p className="text-xs md:text-sm text-gray-600">
                                                {info.description}
                                            </p>
                                        </>
                                    );
                                })()}
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
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                            <p className="text-blue-800">
                                👆 Add exams from the filter bar to start comparing insights
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
