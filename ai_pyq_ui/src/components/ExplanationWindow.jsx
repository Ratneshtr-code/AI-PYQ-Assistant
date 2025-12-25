import { useState, useEffect } from "react";

export default function ExplanationWindow({
    isOpen,
    onClose,
    onMinimize,
    isMinimized,
    questionData,
    selectedOption,
    explanationType,
    isCorrect,
}) {
    const [explanation, setExplanation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && questionData) {
            fetchExplanation();
        } else {
            // Reset state when window closes
            setExplanation("");
            setError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, questionData, selectedOption, explanationType, isCorrect]);

    const fetchExplanation = async () => {
        setLoading(true);
        setError(null);

        try {
            let endpoint = "";
            let body = {};

            if (explanationType === "concept") {
                endpoint = "http://127.0.0.1:8000/explain_concept";
                body = {
                    question_text: questionData.question_text,
                    options: {
                        option_a: questionData.option_a,
                        option_b: questionData.option_b,
                        option_c: questionData.option_c,
                        option_d: questionData.option_d,
                    },
                    correct_option: questionData.correct_option,
                };
            } else if (explanationType === "option") {
                if (isCorrect) {
                    endpoint = "http://127.0.0.1:8000/explain";
                    body = {
                        question_text: questionData.question_text,
                        correct_option: selectedOption,
                    };
                } else {
                    endpoint = "http://127.0.0.1:8000/explain_option";
                    body = {
                        question_text: questionData.question_text,
                        selected_option: selectedOption,
                    };
                }
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (explanationType === "concept") {
                setExplanation(data.explanation || "Explanation not available.");
            } else if (explanationType === "option") {
                if (isCorrect) {
                    setExplanation(data.explanation || "Explanation not available.");
                } else {
                    setExplanation(
                        data.reason || "Explanation not available."
                    );
                }
            }
        } catch (err) {
            setError("Failed to load explanation. Please try again.");
            console.error("Explanation fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getTitle = () => {
        if (explanationType === "concept") {
            return "Concept Explanation";
        } else if (explanationType === "option") {
            return isCorrect ? "Why This Answer is Correct" : "Why This Answer is Incorrect";
        }
        return "Explanation";
    };

    const getHeaderStyle = () => {
        if (explanationType === "concept") {
            return { background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" };
        } else if (explanationType === "option") {
            return isCorrect 
                ? { background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }
                : { background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)" };
        }
        return { background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" };
    };

    return (
        <>
            {/* Mobile: Backdrop */}
            <div
                className="explanation-backdrop md:hidden"
                onClick={onClose}
            />

            {/* Explanation Window */}
            <div className={`explanation-window ${isMinimized ? 'explanation-window-minimized' : ''}`}>
                {/* Header */}
                <div className="explanation-header" style={getHeaderStyle()}>
                    <h3 className="explanation-title">{getTitle()}</h3>
                    <div className="explanation-header-buttons">
                        <button
                            onClick={onMinimize}
                            className="explanation-minimize-btn hover:bg-white/20"
                            aria-label={isMinimized ? "Restore explanation" : "Minimize explanation"}
                            title={isMinimized ? "Restore" : "Minimize"}
                        >
                            {isMinimized ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                        clipRule="evenodd"
                                    />
                                    <path
                                        fillRule="evenodd"
                                        d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="explanation-close-btn hover:bg-white/20"
                            aria-label="Close explanation"
                            title="Close"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content - hidden when minimized */}
                {!isMinimized && (
                <div className="explanation-content">
                    {loading ? (
                        <div className="explanation-loading">
                            <div className="loading-spinner"></div>
                            <p>Generating explanation...</p>
                        </div>
                    ) : error ? (
                        <div className="explanation-error">
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={fetchExplanation}
                                className="btn-action btn-blue mt-3"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="explanation-text">
                            {explanation ? (
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: explanation.replace(
                                            /\n/g,
                                            "<br/>"
                                        ),
                                    }}
                                />
                            ) : (
                                <p className="text-gray-500">
                                    No explanation available.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                )}
            </div>
        </>
    );
}

