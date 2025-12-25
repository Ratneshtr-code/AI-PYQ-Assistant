// src/ExamDashboardPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import SecondarySidebar from "./components/SecondarySidebar";
import FilterBar from "./components/FilterBar";
import ExamAnalysis from "./components/ExamAnalysis";
import SubjectAnalysis from "./components/SubjectAnalysis";
import HottestTopicsByExam from "./components/HottestTopicsByExam";
import HottestTopicsBySubject from "./components/HottestTopicsBySubject";

export default function ExamDashboardPage() {
    const [exam, setExam] = useState("");
    const [subject, setSubject] = useState("");
    const [yearFrom, setYearFrom] = useState(null);
    const [yearTo, setYearTo] = useState(null);
    const [examsList, setExamsList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [activeSubPage, setActiveSubPage] = useState("exam-analysis");
    const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(true);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

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

    const renderContent = () => {
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
                return <ExamAnalysis exam={exam} yearFrom={yearFrom} yearTo={yearTo} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar 
                exam={exam} 
                setExam={setExam} 
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
                type="exam-dashboard"
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
                        showSubject={activeSubPage === "subject-analysis" || activeSubPage === "hottest-topics-by-subject"}
                        showExam={activeSubPage === "exam-analysis" || activeSubPage === "hottest-topics-by-exam" || activeSubPage === "hottest-topics-by-subject"}
                    />
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4 relative z-0">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between">
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
                </div>
            </main>
        </div>
    );
}
