// src/components/exam/ExamResults.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import SolutionViewer from "./SolutionViewer";
import { buildApiUrl } from "../../config/apiConfig";
import { useMobileDetection } from "../../utils/useMobileDetection";

export default function ExamResults() {
    const navigate = useNavigate();
    const { attemptId } = useParams();
    const isMobile = useMobileDetection();
    const [analysis, setAnalysis] = useState(null);
    const [solutions, setSolutions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Category dropdown removed - not currently implemented in backend
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);
    const [showSolutionViewer, setShowSolutionViewer] = useState(false);
    const [examSetName, setExamSetName] = useState("");
    const [activeWeaknessTab, setActiveWeaknessTab] = useState("weak"); // "weak" or "not_attempted"
    const [examLanguage, setExamLanguage] = useState("en"); // Language used during exam
    const [activeMainTab, setActiveMainTab] = useState("analysis"); // "analysis", "solutions", "leaderboard"
    const [solutionsFilter, setSolutionsFilter] = useState("all"); // "all", "overtime", "unattempted"

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                // First fetch attempt details to get exam_set_id and exam set name
                const attemptRes = await fetch(buildApiUrl(`exam/attempt/${attemptId}`), {
                    credentials: "include",
                    headers: {
                        "Accept": "application/json"
                    }
                });
                
                const [analysisRes, solutionsRes] = await Promise.all([
                    fetch(buildApiUrl(`exam/attempt/${attemptId}/analysis`), {
                        credentials: "include",
                        headers: {
                            "Accept": "application/json"
                        }
                    }),
                    fetch(buildApiUrl(`exam/attempt/${attemptId}/solutions`), {
                        credentials: "include",
                        headers: {
                            "Accept": "application/json"
                        }
                    })
                ]);

                // Check content-type first before reading body
                const analysisContentType = analysisRes.headers.get("content-type") || "";
                const solutionsContentType = solutionsRes.headers.get("content-type") || "";
                
                // Helper function to safely parse response
                const parseResponse = async (response, contentType, responseName) => {
                    if (contentType.includes("text/html")) {
                        const text = await response.text();
                        console.error(`❌ [ExamResults] ${responseName} response is HTML error page:`, text.substring(0, 200));
                        throw new Error("Server returned an error page. Please check your connection and try again.");
                    }
                    
                    if (!response.ok) {
                        if (contentType.includes("application/json")) {
                            try {
                                const errorData = await response.json();
                                throw new Error(errorData.message || errorData.error || `Failed to fetch ${responseName}`);
                            } catch (parseErr) {
                                throw new Error(`Failed to fetch ${responseName}`);
                            }
                        } else {
                            const text = await response.text();
                            console.error(`❌ [ExamResults] ${responseName} error response:`, text.substring(0, 200));
                            throw new Error(`Failed to fetch ${responseName}`);
                        }
                    }
                    
                    if (!contentType.includes("application/json")) {
                        const text = await response.text();
                        console.error(`❌ [ExamResults] ${responseName} response is not JSON:`, contentType, text.substring(0, 200));
                        throw new Error("Server returned invalid response format. Please try again.");
                    }
                    
                    return await response.json();
                };

                // Parse both responses
                const [analysisData, solutionsData] = await Promise.all([
                    parseResponse(analysisRes, analysisContentType, "Analysis"),
                    parseResponse(solutionsRes, solutionsContentType, "Solutions")
                ]);
                
                setAnalysis(analysisData);
                setSolutions(solutionsData.solutions);
                
                // Store exam language from solutions response for SolutionViewer
                if (solutionsData.language) {
                    setExamLanguage(solutionsData.language);
                }
                
                // Get attempt data (only read once)
                let attemptData = null;
                if (attemptRes.ok) {
                    const attemptContentType = attemptRes.headers.get("content-type");
                    if (attemptContentType && attemptContentType.includes("application/json")) {
                        attemptData = await attemptRes.json();
                    } else {
                        console.warn("⚠️ [ExamResults] Attempt response is not JSON, skipping");
                    }
                }
                
                // Get exam set name from attempt data or analysis
                const examSetName = attemptData?.exam_set?.name || analysisData.exam_set_name || analysisData.exam_set?.name || "";
                setExamSetName(examSetName);
                
                // Store attempt info in localStorage for quick access on Exam Mode page
                try {
                    let examSetId = null;
                    if (attemptData) {
                        examSetId = attemptData.exam_set_id || attemptData.exam_set?.id || analysisData.exam_set_id;
                    } else {
                        examSetId = analysisData.exam_set_id || analysisData.examSetId;
                    }
                    
                    if (examSetId) {
                        // Get score and total_marks from analysis data (same as shown in results page)
                        const score = analysisData.overall_performance?.score || 0;
                        const totalMarks = analysisData.overall_performance?.total_marks || 0;
                        
                        const attemptInfo = {
                            attempt_id: attemptId,
                            exam_set_id: examSetId,
                            status: 'submitted', // Match database enum value
                            completed_at: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            score: score,
                            total_marks: totalMarks
                        };
                        
                        const storedAttempts = JSON.parse(localStorage.getItem('exam_attempts') || '{}');
                        storedAttempts[String(examSetId)] = attemptInfo;
                        localStorage.setItem('exam_attempts', JSON.stringify(storedAttempts));
                        console.log("Stored attempt in localStorage:", attemptInfo);
                    }
                } catch (err) {
                    console.error("Failed to store attempt in localStorage:", err);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (attemptId) {
            fetchAnalysis();
        }
    }, [attemptId]);

    const handleReattempt = async () => {
        try {
            const response = await fetch(buildApiUrl(`exam/attempt/${attemptId}/reattempt`), {
                method: "POST",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to start reattempt");
            }

            // Check if response is actually JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("❌ [ExamResults] Reattempt response is not JSON:", contentType, text.substring(0, 200));
                throw new Error("Server returned invalid response format. Please try again.");
            }

            const data = await response.json();
            navigate(`/exam/${data.attempt_id}`);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleViewSolution = (questionId) => {
        setSelectedQuestionId(questionId);
        setShowSolutionViewer(true);
    };

    // Compute unattempted areas from solutions data (more accurate than backend)
    // This ensures subjects with partial attempts are still shown
    const computeUnattemptedAreas = () => {
        if (!solutions) return [];
        
        // Group unattempted questions by subject
        const unattemptedBySubject = {};
        solutions.forEach((solution, index) => {
            // A question is unattempted if it has no selected_option
            if (!solution.selected_option) {
                const subject = solution.subject || "General";
                if (!unattemptedBySubject[subject]) {
                    unattemptedBySubject[subject] = [];
                }
                // Store actual question number (index + 1) instead of question_id
                unattemptedBySubject[subject].push({
                    question_id: solution.question_id,
                    question_number: index + 1
                });
            }
        });
        
        // Convert to array format matching backend structure
        return Object.entries(unattemptedBySubject).map(([subject, questionData]) => ({
            subject,
            question_ids: questionData.map(q => q.question_number), // Use question numbers for display
            question_data: questionData // Keep full data for navigation
        }));
    };

    // Get all unattempted question IDs (computed from solutions)
    const getUnattemptedQuestionIds = () => {
        if (!solutions) return [];
        return solutions
            .filter(s => !s.selected_option)
            .map(s => s.question_id);
    };

    const unattemptedQuestionIds = getUnattemptedQuestionIds();
    const computedUnattemptedAreas = computeUnattemptedAreas();

    // Convert weak areas question IDs to actual question numbers
    const convertWeakAreasToQuestionNumbers = () => {
        if (!analysis?.weak_areas?.weak_chapters || !solutions) {
            return analysis?.weak_areas?.weak_chapters || [];
        }
        
        return analysis.weak_areas.weak_chapters.map(chapter => {
            // Map each question_id to its actual question number in the exam
            const questionData = chapter.question_ids.map(qId => {
                const solutionIndex = solutions.findIndex(s => s.question_id === qId);
                return {
                    question_id: qId,
                    question_number: solutionIndex >= 0 ? solutionIndex + 1 : qId // Fallback to qId if not found
                };
            });
            
            return {
                ...chapter,
                question_ids: questionData.map(q => q.question_number), // Use question numbers for display
                question_data: questionData // Keep full data for navigation
            };
        });
    };

    const weakAreasWithQuestionNumbers = convertWeakAreasToQuestionNumbers();

    // Calculate solutions filter counts
    const getSolutionsFilterCounts = () => {
        if (!solutions) return { all: 0, overtime: 0, unattempted: 0 };
        
        const avgTimePerQuestion = analysis?.overall_performance?.total_questions 
            ? (analysis.exam_set?.duration_minutes * 60 / analysis.overall_performance.total_questions)
            : 60; // Default 60 seconds per question
        
        const overtime = solutions.filter(s => (s.time_spent_seconds || 0) > avgTimePerQuestion * 1.5).length;
        // Use the same unattempted question IDs from backend analysis
        const unattempted = solutions.filter(s => unattemptedQuestionIds.includes(s.question_id)).length;
        
        return {
            all: solutions.length,
            overtime,
            unattempted
        };
    };

    const filterCounts = getSolutionsFilterCounts();

    // Filter solutions based on selected filter, preserving original order and indices
    const getFilteredSolutions = () => {
        if (!solutions) return [];
        
        const avgTimePerQuestion = analysis?.overall_performance?.total_questions 
            ? (analysis.exam_set?.duration_minutes * 60 / analysis.overall_performance.total_questions)
            : 60; // Default 60 seconds per question
        
        let filtered = [];
        switch (solutionsFilter) {
            case "overtime":
                filtered = solutions.filter(s => (s.time_spent_seconds || 0) > avgTimePerQuestion * 1.5);
                break;
            case "unattempted":
                // Use the same unattempted question IDs to match "Not Attempted Areas"
                filtered = solutions.filter(s => unattemptedQuestionIds.includes(s.question_id));
                break;
            default:
                filtered = solutions;
        }
        
        // Preserve original indices for correct question numbering
        return filtered.map(solution => {
            const originalIndex = solutions.findIndex(s => s.question_id === solution.question_id);
            return {
                ...solution,
                originalIndex: originalIndex >= 0 ? originalIndex : 0
            };
        });
    };

    // Group solutions by subject, preserving original question numbers
    const groupSolutionsBySubject = (solutionsList) => {
        const grouped = {};
        solutionsList.forEach((solution) => {
            const subject = solution.subject || "General";
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            // Preserve the original index from the full solutions array
            const originalIndex = solutions.findIndex(s => s.question_id === solution.question_id);
            grouped[subject].push({ 
                ...solution, 
                originalIndex: originalIndex >= 0 ? originalIndex : solution.originalIndex || 0
            });
        });
        return grouped;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-4">Loading results...</p>
                </div>
            </div>
        );
    }

    if (error || !analysis) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg">{error || "Results not found"}</p>
                    <button
                        onClick={() => {
                            // Restore filter state from localStorage
                            const testType = localStorage.getItem("examMode_testType") || "exam";
                            const exam = localStorage.getItem("examMode_exam") || "";
                            const subject = localStorage.getItem("examMode_subject") || "";
                            
                            // Build URL with filter params
                            const params = new URLSearchParams();
                            if (testType) params.set("testType", testType);
                            if (exam) params.set("exam", exam);
                            if (subject) params.set("subject", subject);
                            
                            navigate(`/exam-mode?${params.toString()}`);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const perf = analysis.overall_performance;
    const cutoffMarks = perf.cutoff_marks || 0;
    const cutoffGap = perf.cutoff_gap || 0;  // Positive = below cutoff, negative = above cutoff
    const isAboveCutoff = cutoffGap < 0;  // If gap is negative, score is above cutoff
    const gapAbs = Math.abs(cutoffGap);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 py-4 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            {/* Mobile: Back Button */}
                            {isMobile && (
                                <button
                                    onClick={() => {
                                        // Restore filter state from localStorage
                                        const testType = localStorage.getItem("examMode_testType") || "exam";
                                        const exam = localStorage.getItem("examMode_exam") || "";
                                        const subject = localStorage.getItem("examMode_subject") || "";
                                        
                                        // Build URL with filter params
                                        const params = new URLSearchParams();
                                        if (testType) params.set("testType", testType);
                                        if (exam) params.set("exam", exam);
                                        if (subject) params.set("subject", subject);
                                        
                                        navigate(`/exam-mode?${params.toString()}`);
                                    }}
                                    className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Go back to Practice"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                                {isMobile ? "Results" : `Exam Results${examSetName ? ` - ${examSetName.length > 30 ? examSetName.substring(0, 30) + '...' : examSetName}` : ''}`}
                            </h1>
                        </div>
                        {/* Desktop: Show buttons in header */}
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={handleReattempt}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                                Reattempt This Test
                            </button>
                            <button
                                onClick={() => {
                                    // Restore filter state from localStorage
                                    const testType = localStorage.getItem("examMode_testType") || "exam";
                                    const exam = localStorage.getItem("examMode_exam") || "";
                                    const subject = localStorage.getItem("examMode_subject") || "";
                                    
                                    // Build URL with filter params
                                    const params = new URLSearchParams();
                                    if (testType) params.set("testType", testType);
                                    if (exam) params.set("exam", exam);
                                    if (subject) params.set("subject", subject);
                                    
                                    navigate(`/exam-mode?${params.toString()}`);
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors whitespace-nowrap"
                            >
                                Go to Tests
                            </button>
                            <button
                                onClick={() => {
                                    setActiveMainTab("solutions");
                                    setShowSolutionViewer(true);
                                }}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors whitespace-nowrap"
                            >
                                Solutions
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile: Tab Navigation */}
            {isMobile && (
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveMainTab("analysis")}
                                className={`flex-1 px-4 py-3 font-semibold text-sm transition-colors relative ${
                                    activeMainTab === "analysis"
                                        ? "text-gray-900"
                                        : "text-gray-500"
                                }`}
                            >
                                Analysis
                                {activeMainTab === "analysis" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveMainTab("solutions")}
                                className={`flex-1 px-4 py-3 font-semibold text-sm transition-colors relative ${
                                    activeMainTab === "solutions"
                                        ? "text-gray-900"
                                        : "text-gray-500"
                                }`}
                            >
                                Solutions
                                {activeMainTab === "solutions" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveMainTab("leaderboard")}
                                className={`flex-1 px-4 py-3 font-semibold text-sm transition-colors relative ${
                                    activeMainTab === "leaderboard"
                                        ? "text-gray-900"
                                        : "text-gray-500"
                                }`}
                            >
                                Leaderboard
                                {activeMainTab === "leaderboard" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop: Tab Navigation (if needed) */}
            {!isMobile && (
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveMainTab("analysis")}
                                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                                    activeMainTab === "analysis"
                                        ? "text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Analysis
                                {activeMainTab === "analysis" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setActiveMainTab("solutions");
                                    setShowSolutionViewer(true);
                                }}
                                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                                    activeMainTab === "solutions"
                                        ? "text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Solutions
                                {activeMainTab === "solutions" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveMainTab("leaderboard")}
                                className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                                    activeMainTab === "leaderboard"
                                        ? "text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Leaderboard
                                {activeMainTab === "leaderboard" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Tab Content */}
                {activeMainTab === "analysis" && (
                    <>
                        {/* Overall Performance Summary */}
                        <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Performance Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg text-center"
                        >
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {perf.rank} / {perf.total_attempts}
                            </div>
                            <div className="text-sm text-gray-600">Rank</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg text-center"
                        >
                            <div className="text-3xl mb-2">📊</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {perf.score} / {perf.total_marks}
                            </div>
                            <div className="text-sm text-gray-600">Score</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg text-center"
                        >
                            <div className="text-3xl mb-2">📝</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {perf.attempted} / {perf.total_questions}
                            </div>
                            <div className="text-sm text-gray-600">Attempted</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg text-center"
                        >
                            <div className="text-3xl mb-2">🎯</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {perf.accuracy}%
                            </div>
                            <div className="text-sm text-gray-600">Accuracy</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg text-center"
                        >
                            <div className="text-3xl mb-2">📈</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {perf.percentile}%
                            </div>
                            <div className="text-sm text-gray-600">Percentile</div>
                        </motion.div>
                    </div>
                </div>

                {/* Marks Distribution */}
                {perf.marks_gained !== undefined && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Marks Distribution</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Marks Gained */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg"
                        >
                            <div className="text-3xl mb-2">💰</div>
                            <div className="text-2xl font-bold text-green-600 mb-2">
                                +{perf.marks_gained?.toFixed(1) || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-3">Marks Gained</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${((perf.marks_gained || 0) / perf.total_marks) * 100}%`
                                    }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {perf.correct || 0} correct
                            </div>
                        </motion.div>

                        {/* Marks Lost */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg"
                        >
                            <div className="text-3xl mb-2">❌</div>
                            <div className="text-2xl font-bold text-red-600 mb-2">
                                -{perf.marks_lost?.toFixed(1) || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-3">Marks Lost</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${((perf.marks_lost || 0) / perf.total_marks) * 100}%`
                                    }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {perf.wrong || 0} wrong
                            </div>
                        </motion.div>

                        {/* Net Score */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg"
                        >
                            <div className="text-3xl mb-2">📊</div>
                            <div className="text-2xl font-bold text-blue-600 mb-2">
                                {perf.score?.toFixed(1) || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-3">Net Score</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${((perf.score || 0) / perf.total_marks) * 100}%`
                                    }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {((perf.score || 0) / perf.total_marks * 100).toFixed(1)}% of total
                            </div>
                        </motion.div>

                        {/* Potential Marks */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg"
                        >
                            <div className="text-3xl mb-2">🎯</div>
                            <div className="text-2xl font-bold text-yellow-600 mb-2">
                                {perf.potential_marks?.toFixed(1) || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-3">Potential Marks</div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                        width: `${((perf.potential_marks || 0) / perf.total_marks) * 100}%`
                                    }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                If all attempted correct
                            </div>
                        </motion.div>
                    </div>
                </div>
                )}

                {/* Cutoff Marks and Gap */}
                {cutoffMarks > 0 && (
                <div className={`mb-8 border-l-4 p-6 rounded-r-lg ${
                    isAboveCutoff 
                        ? "bg-green-50 border-green-500" 
                        : "bg-red-50 border-red-500"
                }`}>
                    <div className="flex items-center gap-4">
                        <div className="text-4xl">{isAboveCutoff ? "✅" : "⚠️"}</div>
                        <div className="flex-1">
                            {isAboveCutoff ? (
                                <>
                                    <p className="text-lg font-bold text-green-800">
                                        You scored <span className="text-2xl">{gapAbs.toFixed(1)} Marks</span> ▲ above cutoff!
                                    </p>
                                    <p className="text-sm text-green-600 mt-1">
                                        Cutoff: {cutoffMarks.toFixed(1)} marks | Your score: {perf.score.toFixed(1)} marks
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-bold text-red-800">
                                        You scored <span className="text-2xl">{gapAbs.toFixed(1)} Marks</span> ▼ below cutoff!
                                    </p>
                                    <p className="text-sm text-red-600 mt-1">
                                        Cutoff: {cutoffMarks.toFixed(1)} marks | Your score: {perf.score.toFixed(1)} marks
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* Sectional Summary */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Sectional Summary</h2>
                        {/* Category dropdown removed - not currently implemented in backend */}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-4 py-3 text-left">Section Name</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center">Score</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center">Attempted</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center">Accuracy</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.sectional_summary.map((section, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-4 py-3 font-semibold">{section.section_name}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{section.score.toFixed(1)}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">
                                            {section.answered} / {section.total_questions}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full"
                                                        style={{ width: `${section.accuracy}%` }}
                                                    ></div>
                                                </div>
                                                <span>{section.accuracy}%</span>
                                            </div>
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">
                                            {Math.floor(section.time_spent / 60)}:{(section.time_spent % 60).toString().padStart(2, '0')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Weakness and Strengths Analysis */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Your Weakness and Strengths</h2>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-4">
                        <button
                            onClick={() => setActiveWeaknessTab("weak")}
                            className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                                activeWeaknessTab === "weak"
                                    ? "text-red-600"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            Weak Areas
                            {activeWeaknessTab === "weak" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveWeaknessTab("not_attempted")}
                            className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
                                activeWeaknessTab === "not_attempted"
                                    ? "text-yellow-600"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            Not Attempted Areas
                            {activeWeaknessTab === "not_attempted" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-600"></div>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="mt-4">
                        {/* Weak Areas Tab */}
                        {activeWeaknessTab === "weak" && (
                            <div>
                                {weakAreasWithQuestionNumbers && weakAreasWithQuestionNumbers.length > 0 ? (
                                    <div className="space-y-3">
                                        {weakAreasWithQuestionNumbers.map((chapter, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-900 flex-shrink-0 min-w-[200px]">
                                                        {chapter.subject}
                                                    </span>
                                                    <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
                                                        {chapter.question_data.map((qData) => (
                                                            <button
                                                                key={qData.question_id}
                                                                onClick={() => handleViewSolution(qData.question_id)}
                                                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                                                            >
                                                                {qData.question_number}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No weak areas found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Not Attempted Areas Tab */}
                        {activeWeaknessTab === "not_attempted" && (
                            <div>
                                {computedUnattemptedAreas && computedUnattemptedAreas.length > 0 ? (
                                    <div className="space-y-3">
                                        {computedUnattemptedAreas.map((area, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-900 flex-shrink-0 min-w-[200px]">
                                                        {area.subject}
                                                    </span>
                                                    <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
                                                        {area.question_data.map((qData) => (
                                                            <button
                                                                key={qData.question_id}
                                                                onClick={() => handleViewSolution(qData.question_id)}
                                                                className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium hover:bg-yellow-200 transition-colors"
                                                            >
                                                                {qData.question_number}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No unattempted areas found.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                    </>
                )}

                {/* Solutions Tab Content */}
                {activeMainTab === "solutions" && solutions && (
                    <div>
                        {/* Filter Buttons */}
                        <div className="mb-6 flex gap-3 flex-wrap">
                            <button
                                onClick={() => setSolutionsFilter("all")}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                    solutionsFilter === "all"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                All ({filterCounts.all})
                            </button>
                            <button
                                onClick={() => setSolutionsFilter("overtime")}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                    solutionsFilter === "overtime"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                Overtime ({filterCounts.overtime})
                            </button>
                            <button
                                onClick={() => setSolutionsFilter("unattempted")}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                    solutionsFilter === "unattempted"
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                Unattempted ({filterCounts.unattempted})
                            </button>
                        </div>

                        {/* Solutions by Subject */}
                        {(() => {
                            const filteredSolutions = getFilteredSolutions();
                            const groupedSolutions = groupSolutionsBySubject(filteredSolutions);
                            
                            return Object.entries(groupedSolutions).map(([subject, subjectSolutions]) => (
                                <div key={subject} className="mb-8">
                                    <div className="mb-4">
                                        <h2 className="text-lg font-bold text-gray-900">{subject.toUpperCase()}</h2>
                                        <p className="text-sm text-gray-600">{subjectSolutions.length} Questions</p>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {subjectSolutions.map((solution, idx) => {
                                            const questionNumber = solution.originalIndex + 1;
                                            const isCorrect = solution.is_correct;
                                            
                                            return (
                                                <div
                                                    key={solution.question_id}
                                                    onClick={() => handleViewSolution(solution.question_id)}
                                                    className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold text-gray-700">
                                                            {questionNumber}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                {solution.time_spent_seconds > 0 && (
                                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                        {Math.floor(solution.time_spent_seconds / 60)}:{(solution.time_spent_seconds % 60).toString().padStart(2, '0')}
                                                                    </span>
                                                                )}
                                                                {solution.percentage_correct !== undefined && (
                                                                    <span className="text-xs text-gray-600">
                                                                        {solution.percentage_correct}% got it right
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-800 line-clamp-2">
                                                                {solution.question_text}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Bookmark functionality can be added here
                                                            }}
                                                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}

                {/* Leaderboard Tab Content */}
                {activeMainTab === "leaderboard" && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Leaderboard</h2>
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg mb-2">Leaderboard feature coming soon!</p>
                            <p className="text-sm">Check back later to see how you rank among all participants.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Solution Viewer */}
            {showSolutionViewer && solutions && (
                <SolutionViewer
                    solutions={solutions}
                    currentQuestionId={selectedQuestionId || solutions[0]?.question_id}
                    examLanguage={examLanguage}  // Pass exam language to SolutionViewer
                    onClose={() => {
                        setShowSolutionViewer(false);
                        setSelectedQuestionId(null);
                    }}
                    onNavigate={(questionId) => setSelectedQuestionId(questionId)}
                />
            )}
        </div>
    );
}

