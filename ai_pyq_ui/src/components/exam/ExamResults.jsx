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
    const [selectedCategory, setSelectedCategory] = useState("General");
    const [weakChaptersTab, setWeakChaptersTab] = useState("weak-chapters");
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);
    const [showSolutionViewer, setShowSolutionViewer] = useState(false);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
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
            navigate(`/exam-mode/attempt/${data.attempt_id}`);
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
                        onClick={() => navigate("/exam-mode")}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const perf = analysis.overall_performance;
    const cutoffGap = perf.cutoff_gap || 0;
    const isBelowCutoff = cutoffGap > 0;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 py-4 px-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleReattempt}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Reattempt This Test
                        </button>
                        <button
                            onClick={() => navigate("/exam-mode")}
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

                {/* Cutoff Gap */}
                {isBelowCutoff && (
                    <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">⚠️</div>
                            <div>
                                <p className="text-lg font-bold text-red-800">
                                    You scored <span className="text-2xl">{cutoffGap.toFixed(0)} Marks</span> ▼ less than cutoff!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Performance Feedback */}
                {isBelowCutoff && (
                    <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                            <div className="text-3xl">⚠️</div>
                            <div className="flex-1">
                                <p className="text-gray-800 mb-2">
                                    Major gaps observed, strong basics needed. Turn weaknesses into strengths with guided practice.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sectional Summary */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Sectional Summary</h2>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="General">General</option>
                            <option value="OBC">OBC</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                        </select>
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

                {/* Weak Areas Analysis */}
                <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Your Weakness and Strengths</h2>
                    <div className="flex gap-2 border-b border-gray-200 mb-4">
                        <button
                            onClick={() => setWeakChaptersTab("weak-chapters")}
                            className={`px-4 py-2 font-semibold ${
                                weakChaptersTab === "weak-chapters"
                                    ? "text-blue-600 border-b-2 border-blue-600"
                                    : "text-gray-600"
                            }`}
                        >
                            Weak Chapters
                        </button>
                        <button
                            onClick={() => setWeakChaptersTab("uncategorized")}
                            className={`px-4 py-2 font-semibold ${
                                weakChaptersTab === "uncategorized"
                                    ? "text-blue-600 border-b-2 border-blue-600"
                                    : "text-gray-600"
                            }`}
                        >
                            Uncategorized Chapters
                        </button>
                    </div>

                    {weakChaptersTab === "weak-chapters" && (
                        <div className="space-y-4">
                            {analysis.weak_areas.weak_chapters.map((chapter, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-gray-900">
                                            {idx + 1}. {chapter.subject}
                                        </h3>
                                        <span className="text-sm text-gray-600">
                                            Correct %: {chapter.correct_percentage}%
                                        </span>
                                    </div>
                                    <div className="mb-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-500 h-2 rounded-full"
                                                style={{ width: `${chapter.correct_percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {chapter.question_ids.map((qId) => (
                                            <button
                                                key={qId}
                                                onClick={() => handleViewSolution(qId)}
                                                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold hover:bg-red-200 transition-colors"
                                            >
                                                {qId}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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

