import { useState, useEffect } from "react";
import { uiFeatures, getUIMode } from "../config/uiConfig";

export default function ResultsList({ results }) {
    const [visibleAnswers, setVisibleAnswers] = useState({});
    const [explanations, setExplanations] = useState({});
    const [loadingExplain, setLoadingExplain] = useState({});
    const [optionInsights, setOptionInsights] = useState({});
    const [showSimilarPYQs, setShowSimilarPYQs] = useState({});
    const [isAdmin, setIsAdmin] = useState(uiFeatures.showDebugId());

    // Listen for mode changes to update admin mode without reload
    useEffect(() => {
        const handleModeChange = () => {
            setIsAdmin(uiFeatures.showDebugId());
        };
        
        // Check mode on mount
        setIsAdmin(uiFeatures.showDebugId());
        
        // Listen for custom event from Sidebar
        window.addEventListener('uiModeChanged', handleModeChange);
        // Also listen for storage changes (for cross-tab updates)
        window.addEventListener('storage', handleModeChange);

        return () => {
            window.removeEventListener('uiModeChanged', handleModeChange);
            window.removeEventListener('storage', handleModeChange);
        };
    }, []);

    const toggleAnswer = (id) =>
        setVisibleAnswers((prev) => ({ ...prev, [id]: !prev[id] }));

    const handleShowExplanation = async (item) => {
        const id = item.id || item.json_question_id || item.question_id;
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
        const id = item.id || item.json_question_id || item.question_id;
        const selectedOption = item[optKey];

        if (optionInsights[id]?.[optKey]) {
            setOptionInsights((p) => ({
                ...p,
                [id]: { ...p[id], [optKey]: null },
            }));
            return;
        }

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

    // --- Question text renderer ---
    const renderQuestionText = (item) => {
        const raw = item.question_text || "";
        const format = item.question_format?.toLowerCase?.() || "auto";

        // Escape HTML and convert newlines
        let html = raw
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br/>")
            .replace(/\|/g, "&nbsp;&nbsp;|&nbsp;&nbsp;");

        // 🎯 Improved Table Handling
        if (format === "table" && raw.includes("|")) {
            const lines = raw.split("\n").filter((l) => l.trim() !== "");
            const headerLines = [];
            const tableLines = [];
            const questionLines = [];

            // Smartly group lines
            lines.forEach((line, idx) => {
                if (line.includes("|")) tableLines.push(line);
                else if (tableLines.length === 0) headerLines.push(line);
                else questionLines.push(line);
            });

            // Build table HTML
            const rows = tableLines
                .map((line) => {
                    const cells = line.split("|").map((c) => c.trim());
                    return `<tr>${cells
                        .map((cell) => `<td class='border border-gray-300 px-3 py-1'>${cell}</td>`)
                        .join("")}</tr>`;
                })
                .join("");

            html = `
            <div class='question-text'>
                ${headerLines.join("<br/>")}
                <table class='border border-gray-300 text-sm w-full my-2'>
                    <tbody>${rows}</tbody>
                </table>
                ${questionLines.join("<br/>")}
            </div>
        `;
        }

        return (
            <div
                className="question-text"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    };


    if (!results?.length) return null;

    return (
        <div className="results-container">
            {results.map((item) => {
                // Use id (CSV auto-increment) or json_question_id (original JSON ID) or question_id (legacy)
                const id = item.id || item.json_question_id || item.question_id || `q-${Math.random()}`;
                const showAns = !!visibleAnswers[id];

                return (
                    <div key={id} className="question-card">
                        {/* Question */}
                        {renderQuestionText(item)}

                        {/* Meta Info */}
                        <div className="question-meta">
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
                            {/* Developer/Admin: Question ID for debugging - only visible in admin mode */}
                            {isAdmin && item.id && (
                                <span 
                                    className="flex items-center gap-1 text-[11px] text-gray-400 font-mono cursor-help opacity-70 hover:opacity-100 transition-opacity" 
                                    title={`Question ID (Admin Mode)\nCSV ID: ${item.id}`}
                                >
                                    <span className="text-gray-500">🔍</span>
                                    <span>ID: {item.id}</span>
                                </span>
                            )}
                        </div>

                        {/* Options */}
                        <div className="option-list">
                            {["option_a", "option_b", "option_c", "option_d"].map((optKey) => {
                                const text = item[optKey];
                                const isCorrect = text === item.correct_option;
                                const insight = optionInsights[id]?.[optKey];
                                const correctVisible = isCorrect && showAns;
                                const isPYQVisible = showSimilarPYQs[`${id}-${optKey}`];

                                return (
                                    <div key={optKey}>
                                        <div
                                            onClick={() =>
                                                !isCorrect
                                                    ? handleIncorrectClick(item, optKey)
                                                    : null
                                            }
                                            className={`option-item ${correctVisible
                                                    ? "option-correct"
                                                    : "option-incorrect"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {optKey
                                                        .replace("option_", "")
                                                        .toUpperCase()}
                                                    .
                                                </span>
                                                <span>{text}</span>
                                            </div>
                                            {correctVisible && <span>✅</span>}
                                        </div>

                                        {/* Incorrect Option Insight */}
                                        {insight && (
                                            <div className="incorrect-insight">
                                                <p className="mb-1">
                                                    <strong>Why incorrect:</strong>{" "}
                                                    {insight.reason}
                                                </p>
                                                <p className="mb-2">
                                                    <strong>Topic:</strong>{" "}
                                                    {insight.topic}
                                                </p>

                                                {/* Collapsible Similar PYQs */}
                                                {insight.similar_pyqs?.length > 0 ? (
                                                    <div className="border-t border-amber-300 mt-2 pt-2">
                                                        <button
                                                            onClick={() =>
                                                                toggleSimilarPYQ(id, optKey)
                                                            }
                                                            className={`btn-action ${showSimilarPYQs[
                                                                    `${id}-${optKey}`
                                                                ]
                                                                    ? "btn-purple"
                                                                    : "btn-blue"
                                                                }`}
                                                        >
                                                            {isPYQVisible
                                                                ? "▲ Hide Similar PYQs"
                                                                : "▼ View Similar PYQs"}
                                                        </button>

                                                        {isPYQVisible && (
                                                            <div className="max-h-40 overflow-y-auto mt-3 bg-amber-100/60 border border-amber-200 rounded-lg p-2 scrollbar-thin scrollbar-thumb-amber-400 scrollbar-track-amber-100">
                                                                <ul className="list-disc list-inside text-gray-700 space-y-1">
                                                                    {insight.similar_pyqs.map(
                                                                        (pyq, idx) => (
                                                                            <li
                                                                                key={idx}
                                                                                className="text-sm"
                                                                            >
                                                                                <a
                                                                                    href={pyq.link}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:underline"
                                                                                >
                                                                                    {pyq.question_text}
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
                            })}
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-wrap gap-3 text-sm font-medium mb-4">
                            <button
                                onClick={() => toggleAnswer(id)}
                                className="btn-action btn-blue"
                            >
                                {showAns ? "Hide Answer" : "Show Answer"}
                            </button>

                            <button
                                onClick={() => handleShowExplanation(item)}
                                disabled={loadingExplain[id]}
                                className={`btn-action ${loadingExplain[id]
                                        ? "btn-disabled"
                                        : "btn-purple"
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
                            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-3 text-sm text-green-800">
                                <strong>Correct Answer:</strong>{" "}
                                {item.correct_option} ✅
                            </div>
                        )}

                        {/* Explanation */}
                        {explanations[id] && (
                            <div className="explanation-box">
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
