// src/CrossExamInsightsPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import SecondarySidebar from "./components/SecondarySidebar";
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
                    secondarySidebarOpen ? "ml-64 lg:ml-[496px]" : "ml-64"
                }`}
            >
                {/* Filter Bar - Now part of page content, not sticky */}
                <div className="w-full relative z-10">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg border-b border-indigo-400">
                        <div className="px-4 md:px-8 py-4">
                            <div className="max-w-7xl mx-auto">
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Year Range */}
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                                        <span className="text-white text-sm font-medium whitespace-nowrap">
                                            Year Range:
                                        </span>
                                        <select
                                            value={yearFrom || ""}
                                            onChange={(e) =>
                                                setYearFrom(e.target.value ? parseInt(e.target.value) : null)
                                            }
                                            className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                                        >
                                            <option value="" className="text-gray-800">
                                                From
                                            </option>
                                            {availableYears.map((year) => (
                                                <option key={year} value={year} className="text-gray-800">
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="text-white/80">to</span>
                                        <select
                                            value={yearTo || ""}
                                            onChange={(e) =>
                                                setYearTo(e.target.value ? parseInt(e.target.value) : null)
                                            }
                                            className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                                        >
                                            <option value="" className="text-gray-800">
                                                To
                                            </option>
                                            {availableYears.map((year) => (
                                                <option key={year} value={year} className="text-gray-800">
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Exam Selector */}
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                                        <span className="text-white text-sm font-medium whitespace-nowrap">
                                            Exams:
                                        </span>
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleAddExam(e.target.value);
                                                    e.target.value = "";
                                                }
                                            }}
                                            className="bg-white/20 text-white border border-white/30 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[150px]"
                                        >
                                            <option value="" className="text-gray-800">
                                                + Add Exam
                                            </option>
                                            {examsList
                                                .filter((ex) => !exams.includes(ex))
                                                .map((ex, idx) => (
                                                    <option key={idx} value={ex} className="text-gray-800">
                                                        {ex}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Selected Exams */}
                                    {exams.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {exams.map((exam) => (
                                                <div
                                                    key={exam}
                                                    className="bg-white/20 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                                >
                                                    <span>{exam}</span>
                                                    <button
                                                        onClick={() => handleRemoveExam(exam)}
                                                        className="hover:bg-white/30 rounded-full w-5 h-5 flex items-center justify-center"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {exams.length > maxExams && (
                                        <div className="ml-auto text-yellow-300 text-xs font-medium">
                                            Max {maxExams} exams
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4 relative z-0">
                    {/* Menu Button - Top Left Corner */}
                    {!secondarySidebarOpen && (
                        <button
                            onClick={() => setSecondarySidebarOpen(true)}
                            className="absolute -left-12 top-6 p-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 shadow-sm transition-colors flex items-center justify-center z-10"
                            title="Show sub-pages navigation"
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
                    )}
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
