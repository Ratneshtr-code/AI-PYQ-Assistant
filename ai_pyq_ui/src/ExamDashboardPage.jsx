// src/ExamDashboardPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import SecondarySidebar from "./components/SecondarySidebar";
import FilterBar from "./components/FilterBar";
import ExamAnalysis from "./components/ExamAnalysis";
import SubjectAnalysis from "./components/SubjectAnalysis";
import HotTopicsFocus from "./components/HotTopicsFocus";

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

    // Fetch subjects when exam changes
    useEffect(() => {
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
    }, [exam]);

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
            case "hot-topics":
                return <HotTopicsFocus exam={exam} yearFrom={yearFrom} yearTo={yearTo} />;
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
                onOpenSecondarySidebar={() => setSecondarySidebarOpen(true)}
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
                    secondarySidebarOpen ? "ml-64 lg:ml-[536px]" : "ml-64"
                }`}
            >
                {/* Filter Bar - Now part of page content, not sticky */}
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
                        showSubject={activeSubPage === "subject-analysis"}
                        showExam={activeSubPage !== "subject-analysis"}
                    />
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4 relative z-0">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                📊 Exam Dashboard
                            </h1>
                            <p className="text-sm md:text-base text-gray-600">
                                Data-driven insights to help you prioritize your study based on PYQ patterns
                            </p>
                        </div>
                        {!secondarySidebarOpen && (
                            <button
                                onClick={() => setSecondarySidebarOpen(true)}
                                className="ml-4 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
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
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                                <span className="text-sm font-medium">Show Navigation</span>
                            </button>
                        )}
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
                    {!exam && activeSubPage === "exam-analysis" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                            <p className="text-blue-800">
                                👆 Select an exam from the filter bar to view analytics and insights
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
