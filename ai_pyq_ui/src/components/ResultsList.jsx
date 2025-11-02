import { useState } from "react";

/**
 * ResultsList
 * - Shows questions and options (2x2 grid)
 * - "Show Answer" toggles per-question answer visibility
 * - Clicking incorrect option shows why it's incorrect (mock)
 * - "Show Explanation" fetches the correct answer explanation
 * - Shows multiple similar PYQs for incorrect answers
 */
export default function ResultsList({ results }) {
    const [visibleAnswers, setVisibleAnswers] = useState({});
    const [explanations, setExplanations] = useState({});
    const [loadingExplain, setLoadingExplain] = useState({});
    const [optionInsights, setOptionInsights] = useState({});

    const toggleAnswer = (id) => {
        setVisibleAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Show Explanation for Correct Answer ---
    const handleShowExplanation = async (item) => {
        const id = item.question_id;
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
            setExplanations((prev) => ({
                ...prev,
                [id]: data.explanation || "Explanation not available.",
            }));
        } catch (err) {
            console.error("Error fetching explanation:", err);
            setExplanations((prev) => ({
                ...prev,
                [id]: "Failed to load explanation.",
            }));
        } finally {
            setLoadingExplain((prev) => ({ ...prev, [id]: false }));
        }
    };

    // --- On clicking an incorrect option ---
    const handleIncorrectClick = async (item, optKey) => {
        const id = item.question_id;
        const selectedOption = item[optKey];

        // Toggle hide if already visible
        if (optionInsights[id]?.[optKey]) {
            setOptionInsights((prev) => ({
                ...prev,
                [id]: { ...prev[id], [optKey]: null },
            }));
            return;
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/explain_option", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question_text: item.question_text,
                    selected_option: selectedOption,
                }),
            });

            const data = await res.json();
            setOptionInsights((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    [optKey]: {
                        reason: data.reason || "No explanation available.",
                        topic: data.topic || "General Knowledge",
                        similar_pyqs: data.similar_pyqs || [], // ✅ store all PYQs
                    },
                },
            }));
        } catch (err) {
            console.error("Error fetching option insight:", err);
            setOptionInsights((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    [optKey]: {
                        reason: "Failed to load explanation.",
                        topic: "N/A",
                        similar_pyqs: [],
                    },
                },
            }));
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

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            {["option_a", "option_b", "option_c", "option_d"].map(
                                (optKey) => {
                                    const text = item[optKey];
                                    const isCorrect = text === item.correct_option;
                                    const isCorrectAndVisible =
                                        isCorrect && isAnswerVisible;
                                    const insight = optionInsights[id]?.[optKey];

                                    return (
                                        <div key={optKey}>
                                            <div
                                                onClick={() =>
                                                    !isCorrect ? handleIncorrectClick(item, optKey) : null
                                                }
                                                className={`flex items-center p-3 rounded-lg border text-sm transition-all duration-200 cursor-pointer
                          ${isCorrectAndVisible
                                                        ? "bg-green-100 border-green-400 font-semibold"
                                                        : "border-gray-200 hover:bg-gray-50"
                                                    }
                          ${!isCorrect && "hover:border-yellow-300"}
                        `}
                                            >
                                                <span className="font-medium mr-2">
                                                    {optKey.replace("option_", "").toUpperCase()}.
                                                </span>
                                                <span>{text}</span>
                                                {isCorrectAndVisible && (
                                                    <span className="ml-1 text-green-600 text-base">
                                                        ✅
                                                    </span>
                                                )}
                                            </div>

                                            {/* Incorrect option explanation box */}
                                            {insight && (
                                                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-gray-700">
                                                    <p><strong>Why incorrect:</strong> {insight.reason}</p>
                                                    <p><strong>Topic:</strong> {insight.topic}</p>

                                                    {/* Show Similar PYQs Section */}
                                                    {insight.similar_pyqs && insight.similar_pyqs.length > 0 ? (
                                                        <details className="mt-2">
                                                            <summary className="cursor-pointer text-blue-600 hover:underline">
                                                                🔍 View Similar PYQs ({insight.similar_pyqs.length})
                                                            </summary>
                                                            <ul className="mt-2 list-disc list-inside text-gray-700">
                                                                {insight.similar_pyqs.map((pyq, idx) => (
                                                                    <li key={idx} className="my-1">
                                                                        <a
                                                                            href={pyq.link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-600 underline"
                                                                        >
                                                                            {pyq.question_text}
                                                                        </a>
                                                                        <span className="text-gray-500 text-[11px] ml-1">
                                                                            (score: {pyq.score.toFixed(2)})
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </details>
                                                    ) : insight.link ? (
                                                        <a
                                                            href={insight.link}
                                                            className="text-blue-600 underline"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            View Similar PYQ
                                                        </a>
                                                    ) : (
                                                        <p className="italic text-gray-500">🔗 Similar PYQs coming soon</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
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

                        {/* Correct Answer Box */}
                        {isAnswerVisible && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-300 rounded-lg text-sm text-green-800">
                                ✅ Correct Answer: <b>{item.correct_option}</b>
                            </div>
                        )}

                        {/* Explanation for Correct Answer */}
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
