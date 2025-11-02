import { useState } from "react";

export default function ResultsList({ results }) {
    const [visibleAnswers, setVisibleAnswers] = useState({});
    const [explanations, setExplanations] = useState({});
    const [loadingExplain, setLoadingExplain] = useState({});
    const [optionInsights, setOptionInsights] = useState({});
    const [showSimilarPYQs, setShowSimilarPYQs] = useState({});

    const toggleAnswer = (id) =>
        setVisibleAnswers((prev) => ({ ...prev, [id]: !prev[id] }));

    const handleShowExplanation = async (item) => {
        const id = item.question_id;
        if (explanations[id]) {
            setExplanations((prev) => ({ ...prev, [id]: null }));
            return;
        }
        try {
            setLoadingExplain((p) => ({ ...p, [id]: true }));
            const res = await fetch("http://127.0.0.1:8000/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question_text: item.question_text,
                    correct_option: item.correct_option,
                }),
            });
            const data = await res.json();
            setExplanations((p) => ({
                ...p,
                [id]: data.explanation || "Explanation not available.",
            }));
        } catch {
            setExplanations((p) => ({
                ...p,
                [id]: "Failed to load explanation.",
            }));
        } finally {
            setLoadingExplain((p) => ({ ...p, [id]: false }));
        }
    };

    const handleIncorrectClick = async (item, optKey) => {
        const id = item.question_id;
        const selectedOption = item[optKey];

        if (optionInsights[id]?.[optKey]) {
            setOptionInsights((p) => ({
                ...p,
                [id]: { ...p[id], [optKey]: null },
            }));
            return;
        }

        // Close all other incorrect options for this question
        setOptionInsights((p) => ({
            ...p,
            [id]: {},
        }));

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
            setOptionInsights((p) => ({
                ...p,
                [id]: {
                    [optKey]: {
                        reason: data.reason || "No explanation available.",
                        topic: data.topic || "General Knowledge",
                        similar_pyqs: data.similar_pyqs || [],
                    },
                },
            }));
        } catch {
            setOptionInsights((p) => ({
                ...p,
                [id]: {
                    [optKey]: {
                        reason: "Failed to load explanation.",
                        topic: "N/A",
                        similar_pyqs: [],
                    },
                },
            }));
        }
    };

    const toggleSimilarPYQ = (questionId, optionKey) => {
        setShowSimilarPYQs((prev) => ({
            ...prev,
            [`${questionId}-${optionKey}`]:
                !prev[`${questionId}-${optionKey}`],
        }));
    };

    if (!results?.length) return null;

    return (
        <div className="max-w-3xl mx-auto space-y-10 font-sans text-gray-800 leading-relaxed">
            {results.map((item) => {
                const id = item.question_id;
                const showAns = !!visibleAnswers[id];

                return (
                    <div
                        key={id}
                        className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6"
                    >
                        {/* Question */}
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                            {item.question_text}
                        </h3>

                        {/* Meta Info */}
                        <div className="text-sm text-gray-500 mb-5 flex gap-4">
                            {item.exam && (
                                <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                                    {item.exam}
                                </span>
                            )}
                            {item.year && (
                                <span className="flex items-center gap-1">
                                    📅 {item.year}
                                </span>
                            )}
                        </div>

                        {/* Options */}
                        <div className="space-y-2 mb-5">
                            {["option_a", "option_b", "option_c", "option_d"].map(
                                (optKey) => {
                                    const text = item[optKey];
                                    const isCorrect =
                                        text === item.correct_option;
                                    const insight = optionInsights[id]?.[optKey];
                                    const correctVisible =
                                        isCorrect && showAns;

                                    const isPYQVisible =
                                        showSimilarPYQs[
                                        `${id}-${optKey}`
                                        ];

                                    return (
                                        <div key={optKey}>
                                            <div
                                                onClick={() =>
                                                    !isCorrect
                                                        ? handleIncorrectClick(
                                                            item,
                                                            optKey
                                                        )
                                                        : null
                                                }
                                                className={`group flex items-center justify-between p-3 rounded-xl border text-[15px] cursor-pointer transition-all
                                                    ${correctVisible
                                                        ? "bg-green-50 border-green-400 text-green-800 font-semibold"
                                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                                    }
                                                    ${!isCorrect &&
                                                        !correctVisible
                                                        ? "hover:border-yellow-400"
                                                        : ""
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {optKey
                                                            .replace(
                                                                "option_",
                                                                ""
                                                            )
                                                            .toUpperCase()}
                                                        .
                                                    </span>
                                                    <span>{text}</span>
                                                </div>
                                                {correctVisible && (
                                                    <span className="text-green-600 text-base ml-2">
                                                        ✅
                                                    </span>
                                                )}
                                            </div>

                                            {/* Incorrect Option Insight */}
                                            {insight && (
                                                <div className="mt-2 bg-amber-50 border-l-4 border-amber-400 rounded-lg p-3 text-sm text-gray-700">
                                                    <p className="mb-1">
                                                        <strong>
                                                            Why incorrect:
                                                        </strong>{" "}
                                                        {insight.reason}
                                                    </p>
                                                    <p className="mb-2">
                                                        <strong>Topic:</strong>{" "}
                                                        {insight.topic}
                                                    </p>

                                                    {/* Collapsible Similar PYQs */}
                                                    {insight.similar_pyqs?.length >
                                                        0 ? (
                                                        <div className="border-t border-amber-300 mt-2 pt-2">
                                                            <button
                                                                onClick={() =>
                                                                    toggleSimilarPYQ(
                                                                        id,
                                                                        optKey
                                                                    )
                                                                }
                                                                className="text-amber-700 font-semibold text-sm hover:underline focus:outline-none"
                                                            >
                                                                {isPYQVisible
                                                                    ? "▲ Hide Similar PYQs"
                                                                    : "▼ View Similar PYQs"}
                                                            </button>

                                                            {isPYQVisible && (
                                                                <div className="max-h-40 overflow-y-auto mt-2 bg-amber-100/60 border border-amber-200 rounded-lg p-2">
                                                                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                                                                        {insight.similar_pyqs.map(
                                                                            (
                                                                                pyq,
                                                                                idx
                                                                            ) => (
                                                                                <li
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="text-sm"
                                                                                >
                                                                                    <a
                                                                                        href={
                                                                                            pyq.link
                                                                                        }
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-blue-600 hover:underline"
                                                                                    >
                                                                                        {
                                                                                            pyq.question_text
                                                                                        }
                                                                                    </a>
                                                                                    <span className="text-gray-400 text-xs ml-1">
                                                                                        (
                                                                                        {pyq.score?.toFixed(
                                                                                            2
                                                                                        )}
                                                                                        )
                                                                                    </span>
                                                                                </li>
                                                                            )
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="italic text-gray-400">
                                                            🔗 Similar PYQs coming soon
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-3 text-sm font-medium mb-4">
                            <button
                                onClick={() => toggleAnswer(id)}
                                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                            >
                                {showAns ? "Hide Answer" : "Show Answer"}
                            </button>

                            <button
                                onClick={() => handleShowExplanation(item)}
                                disabled={loadingExplain[id]}
                                className={`px-4 py-2 rounded-lg transition ${loadingExplain[id]
                                        ? "bg-purple-100 text-purple-400"
                                        : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                    }`}
                            >
                                {loadingExplain[id]
                                    ? "Loading..."
                                    : explanations[id]
                                        ? "Hide Explanation"
                                        : "Show Explanation"}
                            </button>
                        </div>

                        {/* Correct Answer */}
                        {showAns && (
                            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-3 text-[15px] text-green-800">
                                <strong>Correct Answer:</strong>{" "}
                                {item.correct_option} ✅
                            </div>
                        )}

                        {/* Explanation */}
                        {explanations[id] && (
                            <div className="mt-3 bg-purple-50 border-l-4 border-purple-400 rounded-lg p-3 text-sm text-gray-800">
                                <strong>Explanation:</strong>{" "}
                                {explanations[id]}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
