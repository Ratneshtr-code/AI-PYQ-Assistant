// src/ExamDashboardPage.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import ExamAnalysis from "./components/ExamAnalysis";
import SubjectAnalysis from "./components/SubjectAnalysis";
import HottestTopicsByExam from "./components/HottestTopicsByExam";
import HottestTopicsBySubject from "./components/HottestTopicsBySubject";
import { getCurrentUser, isAuthenticated } from "./utils/auth";

export default function ExamDashboardPage() {
    const [exam, setExam] = useState("");
    const [subject, setSubject] = useState("");
    const [yearFrom, setYearFrom] = useState(null);
    const [yearTo, setYearTo] = useState(null);
    const [examsList, setExamsList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [viewMode, setViewMode] = useState("cards"); // "cards" or "content"
    const [activeSubPage, setActiveSubPage] = useState(null);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

    // Check and sync user authentication state (important for Google OAuth)
    useEffect(() => {
        const syncAuthState = async () => {
            // If localStorage says not logged in, but we have a session cookie, fetch user data
            const isLoggedInLocal = isAuthenticated();
            if (!isLoggedInLocal) {
                // Try to fetch user data - if successful, we have a valid session
                const userData = await getCurrentUser();
                if (userData) {
                    // User is logged in but localStorage wasn't set (e.g., Google OAuth)
                    console.log("User authenticated via session, syncing localStorage");
                    // getCurrentUser already calls setUserData, so we're good
                    // Dispatch event to update sidebar
                    window.dispatchEvent(new Event("userLoggedIn"));
                    window.dispatchEvent(new Event("premiumStatusChanged"));
                }
            }
        };
        syncAuthState();
    }, []);

    useEffect(() => {
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

    // Fetch subjects when exam changes (for Exam Analysis) or all subjects (for Subject Analysis)
    useEffect(() => {
        // For Subject Analysis, fetch all subjects from all exams
        if (activeSubPage === "subject-analysis") {
            if (examsList.length === 0) {
                setSubjectsList([]);
                return;
            }

            // Fetch subjects from all exams and combine them
            const subjectPromises = examsList.map((examName) =>
                fetch(`http://127.0.0.1:8000/dashboard/filters?exam=${encodeURIComponent(examName)}`)
                    .then((res) => res.json())
                    .then((result) => result.subjects || [])
                    .catch(() => [])
            );

            Promise.all(subjectPromises).then((results) => {
                // Combine all subjects and remove duplicates
                const allSubjects = [...new Set(results.flat())];
                setSubjectsList(allSubjects.sort());
            });
        } else {
            // For Exam Analysis, Hottest Topics by Exam, and Hottest Topics by Subject, fetch subjects for the selected exam
            if (!exam) {
                setSubjectsList([]);
                setSubject("");
                return;
            }

            fetch(`http://127.0.0.1:8000/dashboard/filters?exam=${encodeURIComponent(exam)}`)
                .then((res) => res.json())
                .then((result) => {
                    if (result.subjects) {
                        setSubjectsList(result.subjects);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching subjects:", err);
                });
        }
    }, [exam, examsList, activeSubPage]);

    const handleCardClick = (subPageId) => {
        setActiveSubPage(subPageId);
        setViewMode("content");
    };

    const handleBackToCards = () => {
        setViewMode("cards");
        setActiveSubPage(null);
    };

    const renderContent = () => {
        if (!activeSubPage) return null;
        
        switch (activeSubPage) {
            case "exam-analysis":
                return <ExamAnalysis exam={exam} yearFrom={yearFrom} yearTo={yearTo} />;
            case "subject-analysis":
                return (
                    <SubjectAnalysis
                        subject={subject}
                        yearFrom={yearFrom}
                        yearTo={yearTo}
                        examsList={examsList}
                    />
                );
            case "hottest-topics-by-exam":
                return <HottestTopicsByExam exam={exam} yearFrom={yearFrom} yearTo={yearTo} />;
            case "hottest-topics-by-subject":
                return (
                    <HottestTopicsBySubject
                        exam={exam}
                        subject={subject}
                        yearFrom={yearFrom}
                        yearTo={yearTo}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar 
                exam={exam} 
                setExam={setExam} 
                examsList={examsList}
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "ml-16" : "ml-64"
                }`}
            >
                {/* Filter Bar */}
                <div className="w-full relative z-10">
                    <FilterBar
                        exam={exam}
                        setExam={setExam}
                        examsList={examsList}
                        subject={subject}
                        setSubject={setSubject}
                        subjectsList={subjectsList}
                        yearFrom={yearFrom}
                        setYearFrom={setYearFrom}
                        yearTo={yearTo}
                        setYearTo={setYearTo}
                        availableYears={availableYears}
                        showSubject={viewMode === "content" && (activeSubPage === "subject-analysis" || activeSubPage === "hottest-topics-by-subject")}
                        showExam={viewMode === "content" && (activeSubPage === "exam-analysis" || activeSubPage === "hottest-topics-by-exam" || activeSubPage === "hottest-topics-by-subject")}
                    />
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4 relative z-0">
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
                                        📊 Exam Dashboard
                                    </h1>
                                    <p className="text-sm md:text-base text-gray-600">
                                        Data-driven insights to help you prioritize your study based on PYQ patterns
                                    </p>
                                </div>

                                {/* Premium Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-7xl mx-auto">
                                    {/* Exam Analysis Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                        onClick={() => handleCardClick("exam-analysis")}
                                        className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-6 flex flex-col h-full"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col flex-1">
                                            <div className="text-5xl mb-4">📊</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                                Exam Analysis
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
                                                Analyze subject and topic distribution patterns for a selected exam to identify high-priority study areas
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-auto pt-2 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>Explore</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Subject Analysis Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        onClick={() => handleCardClick("subject-analysis")}
                                        className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-6 flex flex-col h-full"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col flex-1">
                                            <div className="text-5xl mb-4">📚</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                                Subject Analysis
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
                                                Explore how a subject is distributed across different exams to understand cross-exam relevance
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-auto pt-2 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>Explore</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Hottest Topic by Exam Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        onClick={() => handleCardClick("hottest-topics-by-exam")}
                                        className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-6 flex flex-col h-full"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col flex-1">
                                            <div className="text-5xl mb-4">🔥</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                                Hottest Topic by Exam
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
                                                Discover the most frequently asked topics for a selected exam to focus your preparation effectively
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-auto pt-2 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>Explore</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Hottest Topic by Subject Card */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 }}
                                        onClick={() => handleCardClick("hottest-topics-by-subject")}
                                        className="group relative bg-white rounded-xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-6 flex flex-col h-full"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* Content */}
                                        <div className="relative z-10 flex flex-col flex-1">
                                            <div className="text-5xl mb-4">🔥</div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                                Hottest Topic by Subject
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">
                                                Identify the most important topics within a specific subject and exam combination for targeted learning
                                            </p>
                                            
                                            {/* Arrow Indicator */}
                                            <div className="mt-auto pt-2 flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                                                <span>Explore</span>
                                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
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
                                                    "exam-analysis": {
                                                        title: "📊 Exam Analysis",
                                                        description: "Analyze subject and topic distribution patterns for a selected exam to identify high-priority study areas"
                                                    },
                                                    "subject-analysis": {
                                                        title: "📚 Subject Analysis",
                                                        description: "Explore how a subject is distributed across different exams to understand cross-exam relevance"
                                                    },
                                                    "hottest-topics-by-exam": {
                                                        title: "🔥 Hottest Topic by Exam",
                                                        description: "Discover the most frequently asked topics for a selected exam to focus your preparation effectively"
                                                    },
                                                    "hottest-topics-by-subject": {
                                                        title: "🔥 Hottest Topic by Subject",
                                                        description: "Identify the most important topics within a specific subject and exam combination for targeted learning"
                                                    }
                                                };
                                                const info = pageInfo[activeSubPage] || {
                                                    title: "📊 Exam Dashboard",
                                                    description: "Data-driven insights to help you prioritize your study based on PYQ patterns"
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
                                {!exam && (activeSubPage === "exam-analysis" || activeSubPage === "hottest-topics-by-exam") && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                                        <p className="text-blue-800">
                                            👆 Select an exam from the filter bar to view analytics and insights
                                        </p>
                                    </div>
                                )}
                                {!subject && activeSubPage === "subject-analysis" && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                                        <p className="text-blue-800">
                                            👆 Select a subject from the filter bar to view analytics and insights
                                        </p>
                                    </div>
                                )}
                                {(!exam || !subject) && activeSubPage === "hottest-topics-by-subject" && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                                        <p className="text-blue-800">
                                            {!exam && !subject
                                                ? "👆 Select an exam and a subject from the filter bar to view hot topics"
                                                : !exam
                                                ? "👆 Select an exam from the filter bar to view hot topics"
                                                : "👆 Select a subject from the filter bar to view hot topics"}
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
