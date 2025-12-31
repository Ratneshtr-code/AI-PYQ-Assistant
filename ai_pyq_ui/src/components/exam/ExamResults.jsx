// src/components/exam/ExamResults.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import SolutionViewer from "./SolutionViewer";

const API_BASE_URL = "";

export default function ExamResults() {
    const navigate = useNavigate();
    const { attemptId } = useParams();
    const [analysis, setAnalysis] = useState(null);
    const [solutions, setSolutions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Category dropdown removed - not currently implemented in backend
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);
    const [showSolutionViewer, setShowSolutionViewer] = useState(false);
    const [examSetName, setExamSetName] = useState("");
    const [activeWeaknessTab, setActiveWeaknessTab] = useState("weak"); // "weak" or "not_attempted"

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                // First fetch attempt details to get exam_set_id and exam set name
                const attemptRes = await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}`, {
                    credentials: "include"
                });
                
                const [analysisRes, solutionsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/analysis`, {
                        credentials: "include"
                    }),
                    fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/solutions`, {
                        credentials: "include"
                    })
                ]);

                if (!analysisRes.ok || !solutionsRes.ok) {
                    throw new Error("Failed to fetch results");
                }

                const analysisData = await analysisRes.json();
                const solutionsData = await solutionsRes.json();
                
                setAnalysis(analysisData);
                setSolutions(solutionsData.solutions);
                
                // Get attempt data (only read once)
                let attemptData = null;
                if (attemptRes.ok) {
                    attemptData = await attemptRes.json();
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
            const response = await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/reattempt`, {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to start reattempt");
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
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Exam Results{examSetName ? ` - ${examSetName}` : ''}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleReattempt}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                            Go to Tests
                        </button>
                        <button
                            onClick={() => setShowSolutionViewer(true)}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                        >
                            Solutions
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
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
                                {analysis.weak_areas.weak_chapters && analysis.weak_areas.weak_chapters.length > 0 ? (
                                    <div className="space-y-3">
                                        {analysis.weak_areas.weak_chapters.map((chapter, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-900 flex-shrink-0 min-w-[200px]">
                                                        {chapter.subject}
                                                    </span>
                                                    <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
                                                        {chapter.question_ids.map((qId) => (
                                                            <button
                                                                key={qId}
                                                                onClick={() => handleViewSolution(qId)}
                                                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                                                            >
                                                                {qId}
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
                                {analysis.weak_areas.not_attempted_areas && analysis.weak_areas.not_attempted_areas.length > 0 ? (
                                    <div className="space-y-3">
                                        {analysis.weak_areas.not_attempted_areas.map((area, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-900 flex-shrink-0 min-w-[200px]">
                                                        {area.subject}
                                                    </span>
                                                    <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
                                                        {area.question_ids.map((qId) => (
                                                            <button
                                                                key={qId}
                                                                onClick={() => handleViewSolution(qId)}
                                                                className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium hover:bg-yellow-200 transition-colors"
                                                            >
                                                                {qId}
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
            </div>

            {/* Solution Viewer */}
            {showSolutionViewer && solutions && (
                <SolutionViewer
                    solutions={solutions}
                    currentQuestionId={selectedQuestionId || solutions[0]?.question_id}
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

