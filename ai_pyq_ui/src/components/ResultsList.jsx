// src/components/ResultsList.jsx
import { useState } from "react";

/**
 * ResultsList
 * - shows questions and options
 * - "Show Answer" toggles a per-question reveal (highlights correct option + shows answer box)
 * - "Show Explanation" hits the mock /explain backend and displays explanation text
 */
export default function ResultsList({ results }) {
    const [visibleAnswers, setVisibleAnswers] = useState({});   // { [question_id]: true/false }
    const [explanations, setExplanations] = useState({});       // { [question_id]: explanationText }
    const [loadingExplain, setLoadingExplain] = useState({});   // { [question_id]: true/false }

    const toggleAnswer = (id) => {
        setVisibleAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleShowExplanation = async (item) => {
        const id = item.question_id;
        // If already have an explanation, toggle hide/show
        if (explanations[id]) {
            setExplanations((prev) => ({ ...prev, [id]: null }));
            return;
        }

        try {
            setLoadingExplain((prev) => ({ ...prev, [id]: true }));

            const res = await fetch("http://127.0.0.1:8000/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question_text: item.question_text,
                    correct_option: item.correct_option,
                }),
            });

            const data = await res.json();
            setExplanations((prev) => ({ ...prev, [id]: data.explanation }));
        } catch (err) {
            console.error("Error fetching explanation:", err);
            setExplanations((prev) => ({ ...prev, [id]: "Failed to load explanation." }));
        } finally {
            setLoadingExplain((prev) => ({ ...prev, [id]: false }));
        }
    };

    if (!results || results.length === 0) return null;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {results.map((item) => {
                const id = item.question_id;
                const isAnswerVisible = !!visibleAnswers[id];

                return (
                    <div
                        key={id}
                        className="bg-white p-5 rounded-xl shadow-sm border border-gray-200"
                    >
                        {/* Question */}
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {item.question_text}
                        </h3>

                        {/* Exam + Year */}
                        <div className="text-sm text-gray-600 mb-3">
                            {item.exam && <span className="mr-3">📘 {item.exam}</span>}
                            {item.year && <span>📅 {item.year}</span>}
                        </div>

                        {/* Options: grid (no bullets) */}
                        {/* Options: 2x2 responsive grid */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {["option_a", "option_b", "option_c", "option_d"].map((optKey) => {
                                const text = item[optKey];
                                const isCorrectAndRevealed = isAnswerVisible && text === item.correct_option;

                                return (
                                     <div
                                        key={optKey}
                                        className={`flex items-center p-3 rounded-lg border text-sm transition-all duration-200
                                            ${isCorrectAndRevealed
                                                ? "bg-green-100 border-green-400 font-semibold"
                                                : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                     >
                                        <span className="font-medium mr-2">
                                            {optKey.replace("option_", "").toUpperCase()}.
                                        </span>
                                        <span>{text}</span>
                                        {isCorrectAndRevealed && (
                                            <span className="ml-1 text-green-600 text-base">✅</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>


                        {/* Buttons */}
                        <div className="flex gap-3 mb-2">
                            <button
                                onClick={() => toggleAnswer(id)}
                                className="text-blue-600 text-sm font-medium hover:underline"
                            >
                                {isAnswerVisible ? "Hide Answer" : "Show Answer"}
                            </button>

                            <button
                                onClick={() => handleShowExplanation(item)}
                                className="text-purple-600 text-sm font-medium hover:underline"
                                disabled={loadingExplain[id]}
                            >
                                {loadingExplain[id]
                                    ? "Loading..."
                                    : explanations[id]
                                        ? "Hide Explanation"
                                        : "Show Explanation"}
                            </button>
                        </div>

                        {/* Explicit answer box (collapsed by default) */}
                        {isAnswerVisible && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-300 rounded-lg text-sm text-green-800">
                                ✅ Correct Answer: <b>{item.correct_option}</b>
                            </div>
                        )}

                        {/* Explanation Section (mock from backend) */}
                        {explanations[id] && (
                            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-gray-700">
                                <strong>Explanation:</strong> {explanations[id]}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
