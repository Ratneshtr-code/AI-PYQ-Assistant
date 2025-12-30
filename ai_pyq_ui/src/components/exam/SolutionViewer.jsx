// src/components/exam/SolutionViewer.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatMarkdown } from "../../utils/formatMarkdown";

const API_BASE_URL = "";

export default function SolutionViewer({ solutions, currentQuestionId, onClose, onNavigate }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [explanation, setExplanation] = useState(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);

    useEffect(() => {
        if (solutions && currentQuestionId) {
            const index = solutions.findIndex(s => s.question_id === currentQuestionId);
            if (index !== -1) {
                setCurrentIndex(index);
            }
        }
    }, [solutions, currentQuestionId]);

    useEffect(() => {
        if (solutions && solutions[currentIndex]) {
            fetchExplanation(solutions[currentIndex]);
        }
    }, [currentIndex, solutions]);

    const fetchExplanation = async (question) => {
        setLoadingExplanation(true);
        try {
            const response = await fetch(`${API_BASE_URL}/explain_concept`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_text: question.question_text,
                    option_a: question.option_a,
                    option_b: question.option_b,
                    option_c: question.option_c,
                    option_d: question.option_d,
                    correct_option: question.correct_option,
                    exam: question.exam,
                    subject: question.subject,
                    topic: question.topic,
                    year: question.year
                })
            });

            if (response.ok) {
                const data = await response.json();
                setExplanation(data.explanation || "");
            } else {
                setExplanation("Explanation not available.");
            }
        } catch (err) {
            setExplanation("Error loading explanation.");
        } finally {
            setLoadingExplanation(false);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            onNavigate?.(solutions[newIndex].question_id);
        }
    };

    const handleNext = () => {
        if (currentIndex < solutions.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            onNavigate?.(solutions[newIndex].question_id);
        }
    };

    if (!solutions || solutions.length === 0) {
        return null;
    }

    const currentQuestion = solutions[currentIndex];
    const isCorrect = currentQuestion.is_correct;
    const correctOptionLetter = currentQuestion.correct_option?.toUpperCase().trim()[0] || "";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            {currentQuestion.subject || "Question"}
                        </h2>
                        <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                            <option>English</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                            Question {currentIndex + 1} of {solutions.length}
                        </span>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Question Status */}
                    <div className="mb-4 flex items-center gap-4">
                        {isCorrect !== null && (
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                                {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                            </span>
                        )}
                        <span className="text-sm text-gray-600">
                            You: {Math.floor(currentQuestion.time_spent_seconds / 60)}:{(currentQuestion.time_spent_seconds % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-sm text-gray-600">
                            Marks: +{currentQuestion.is_correct ? "2" : "0"}
                        </span>
                    </div>

                    {/* Question Text */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Question {currentIndex + 1}
                        </h3>
                        <p className="text-gray-800 leading-relaxed">
                            {currentQuestion.question_text}
                        </p>
                    </div>

                    {/* Options */}
                    <div className="mb-6 space-y-3">
                        {['A', 'B', 'C', 'D'].map((option) => {
                            const optionKey = `option_${option.toLowerCase()}`;
                            const optionText = currentQuestion[optionKey];
                            const isCorrectOption = option === correctOptionLetter;
                            const isSelected = currentQuestion.selected_option?.toUpperCase().trim()[0] === option;

                            return (
                                <div
                                    key={option}
                                    className={`p-4 border-2 rounded-lg ${
                                        isCorrectOption
                                            ? "border-green-500 bg-green-50"
                                            : isSelected && !isCorrectOption
                                            ? "border-red-500 bg-red-50"
                                            : "border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="font-semibold text-gray-700">{option}.</span>
                                        <span className="flex-1 text-gray-800">{optionText}</span>
                                        {isCorrectOption && (
                                            <span className="text-green-600 font-semibold">✓ Correct Answer</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Solution */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Solution:</h3>
                        {loadingExplanation ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <p className="text-gray-500 mt-2">Loading explanation...</p>
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none explanation-text">
                                {explanation ? (
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: formatMarkdown(explanation),
                                        }}
                                    />
                                ) : (
                                    <p className="text-gray-700 leading-relaxed">
                                        Solution: {correctOptionLetter}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ← Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        {currentIndex + 1} / {solutions.length}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === solutions.length - 1}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next →
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

