// src/ExamMockPage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ExamMockPage() {
    const { examName } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [examSets, setExamSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [userAttempts, setUserAttempts] = useState({});
    const userAttemptsRef = useRef({});
    
    const decodedExamName = examName ? decodeURIComponent(examName) : "";

    useEffect(() => {
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
    }, []);

    // Fetch exam sets - Mock tests only, filtered by exam
    useEffect(() => {
        const fetchExamSets = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (decodedExamName) {
                    params.append("exam", decodedExamName);
                }
                
                const url = `${buildApiUrl("exam/sets")}?${params.toString()}`;
                const response = await fetch(url, {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch exam sets");
                }
                
                const data = await response.json();
                // Filter: Only show exam_type === "mock_test"
                const filtered = data.filter(set => 
                    set.exam_type === "mock_test"
                );
                
                let attemptsFromSets = {};
                if (filtered.length > 0 && filtered[0].latest_attempt) {
                    filtered.forEach(set => {
                        if (set.latest_attempt) {
                            attemptsFromSets[String(set.id)] = {
                                attempt_id: set.latest_attempt.id || set.latest_attempt.attempt_id,
                                status: set.latest_attempt.status,
                                completed_at: set.latest_attempt.completed_at,
                                created_at: set.latest_attempt.created_at,
                                score: set.latest_attempt.score || set.latest_attempt.total_score || set.latest_attempt.marks_obtained || 0,
                                total_marks: set.latest_attempt.total_marks || set.latest_attempt.totalMarks || null
                            };
                        }
                    });
                }
                
                if (Object.keys(attemptsFromSets).length > 0) {
                    setUserAttempts(prev => {
                        const updated = { ...prev, ...attemptsFromSets };
                        userAttemptsRef.current = updated;
                        return updated;
                    });
                }
                setExamSets(filtered);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchExamSets();
    }, [decodedExamName]);

    // Fetch user exam attempts
    useEffect(() => {
        const fetchUserAttempts = async () => {
            try {
                let response = await fetch(buildApiUrl("exam/user/attempts"), {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    response = await fetch(buildApiUrl("exam/attempts"), {
                        credentials: "include"
                    });
                }
                
                if (!response.ok) {
                    return;
                }
                
                const data = await response.json();
                const attemptsMap = {};
                if (Array.isArray(data)) {
                    data.forEach(attempt => {
                        const examSetId = String(attempt.exam_set_id || attempt.examSetId || attempt.exam_set?.id);
                        const attemptId = attempt.id || attempt.attempt_id;
                        const status = attempt.status;
                        const createdAt = attempt.created_at || attempt.createdAt;
                        const completedAt = attempt.completed_at || attempt.completedAt;
                        
                        if (examSetId && attemptId) {
                            if (!attemptsMap[examSetId] || 
                                (createdAt && new Date(createdAt) > new Date(attemptsMap[examSetId].created_at || 0))) {
                                attemptsMap[examSetId] = {
                                    attempt_id: attemptId,
                                    status: status,
                                    completed_at: completedAt,
                                    created_at: createdAt,
                                    score: attempt.score || attempt.total_score || attempt.marks_obtained || 0,
                                    total_marks: attempt.total_marks || attempt.totalMarks || null
                                };
                            }
                        }
                    });
                }
                
                userAttemptsRef.current = attemptsMap;
                setUserAttempts(attemptsMap);
            } catch (err) {
                console.error("Error fetching user attempts:", err);
            }
        };
        
        fetchUserAttempts();
    }, []);

    useEffect(() => {
        userAttemptsRef.current = userAttempts;
    }, [userAttempts]);

    const handleStartExam = (examSetId) => {
        navigate(`/exam-mode/instructions/${examSetId}`);
    };

    const handleViewResults = (attemptId) => {
        navigate(`/exam/${attemptId}/results`);
    };

    const handleContinueExam = (attemptId) => {
        navigate(`/exam/${attemptId}`);
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) {
            return `${minutes} Mins`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} Hr ${mins} Mins` : `${hours} Hr`;
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
                {/* Content Area */}
                <div className="w-full max-w-6xl mx-auto px-2 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8 space-y-4">
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
                                    {decodedExamName} {language === "hi" ? "मॉक टेस्ट" : "Mock Tests"}
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600">
                                    {language === "hi"
                                        ? "मॉक टेस्ट लें"
                                        : "Take mock tests"}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-gray-500 mt-4">
                                {language === "hi" ? "परीक्षा सेट लोड हो रहे हैं..." : "Loading exam sets..."}
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Exam Sets Grid */}
                    {!loading && !error && (
                        <>
                            {examSets.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 text-lg">
                                        {language === "hi" ? "कोई परीक्षा सेट नहीं मिला।" : "No exam sets found. Try adjusting your filters."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                    {examSets.map((examSet) => {
                                        const examSetId = String(examSet.id);
                                        const attempt = userAttempts[examSetId] || userAttempts[examSet.id];
                                        const isAttempted = !!attempt;
                                        const isCompleted = attempt?.status === 'completed' || attempt?.status === 'submitted';
                                        const isInProgress = attempt?.status === 'in_progress';
                                        
                                        return (
                                            <div
                                                key={examSet.id}
                                                className={`bg-white rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
                                                    isAttempted ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                                                }`}
                                            >
                                                <div className="p-5">
                                                    <div className="mb-3 flex items-center justify-between gap-2">
                                                        {examSet.exam_type && (
                                                            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                {examSet.exam_type.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {isAttempted && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                {isCompleted ? 'Completed' : 'In Progress'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                                        {examSet.name}
                                                    </h3>

                                                    <div className="space-y-2 mb-4">
                                                        <div className="flex items-center text-sm text-gray-700">
                                                            <span className="font-semibold w-32">Questions:</span>
                                                            <span>{examSet.total_questions}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-700">
                                                            <span className="font-semibold w-32">Duration:</span>
                                                            <span>{formatDuration(examSet.duration_minutes)}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-700">
                                                            <span className="font-semibold w-32">Marks:</span>
                                                            <span>
                                                                {isAttempted && attempt?.score !== undefined && attempt?.score !== null
                                                                    ? `${parseFloat(attempt.score).toFixed(1)}` 
                                                                    : '0'
                                                                } / {attempt?.total_marks || (examSet.total_questions * examSet.marks_per_question)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {isCompleted ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleViewResults(attempt.attempt_id)}
                                                                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                                >
                                                                    {language === "hi" ? "परिणाम देखें" : "View Results"}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStartExam(examSet.id)}
                                                                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 text-sm"
                                                                >
                                                                    {language === "hi" ? "पुनः प्रयास करें" : "Reattempt Test"}
                                                                </button>
                                                            </>
                                                        ) : isInProgress ? (
                                                            <button
                                                                onClick={() => handleContinueExam(attempt.attempt_id)}
                                                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                            >
                                                                {language === "hi" ? "परीक्षा जारी रखें" : "Continue Exam"}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleStartExam(examSet.id)}
                                                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                            >
                                                                {language === "hi" ? "परीक्षा शुरू करें" : "Start Exam"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

