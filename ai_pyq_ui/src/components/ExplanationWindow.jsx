import { useState, useEffect } from "react";
import { getUserData } from "../utils/auth";
import { useLanguage } from "../contexts/LanguageContext";
import { buildApiUrl } from "../config/apiConfig";
import SaveNoteButton from "./SaveNoteButton";
import { formatMarkdown } from "../utils/formatMarkdown";

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
    const [fromCache, setFromCache] = useState(false);
    const [cacheKey, setCacheKey] = useState("");
    const [source, setSource] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const { language } = useLanguage(); // Get language from context

    useEffect(() => {
        // Check admin status
        const userData = getUserData();
        setIsAdmin(userData?.is_admin === true || userData?.is_admin === "true" || userData?.is_admin === 1);
    }, []);

    useEffect(() => {
        if (isOpen && questionData) {
            fetchExplanation();
        } else {
            // Reset state when window closes
            setExplanation("");
            setError(null);
            setFromCache(false);
            setCacheKey("");
            setSource("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, questionData, selectedOption, explanationType, isCorrect, language]);

    const fetchExplanation = async () => {
        setLoading(true);
        setError(null);

        try {
            let endpoint = "";
            let body = {};

            if (explanationType === "concept") {
                endpoint = buildApiUrl("explain_concept");
                body = {
                    question_text: questionData.question_text,
                    options: {
                        option_a: questionData.option_a || "",
                        option_b: questionData.option_b || "",
                        option_c: questionData.option_c || "",
                        option_d: questionData.option_d || "",
                    },
                    option_a: questionData.option_a || "",
                    option_b: questionData.option_b || "",
                    option_c: questionData.option_c || "",
                    option_d: questionData.option_d || "",
                    correct_option: questionData.correct_option || "",
                    exam: questionData.exam || null,
                    subject: questionData.subject || null,
                    topic: questionData.topic || questionData.topic_tag || null,
                    year: questionData.year || null,
                    language: language || "en",
                    // Include question_id for cache key
                    question_id: questionData.id || questionData.question_id || questionData.json_question_id || null,
                    id: questionData.id || questionData.question_id || questionData.json_question_id || null,
                    json_question_id: questionData.json_question_id || questionData.question_id || questionData.id || null,
                };
            } else if (explanationType === "option") {
                if (isCorrect) {
                    endpoint = buildApiUrl("explain");
                    body = {
                        question_text: questionData.question_text,
                        correct_option: questionData.correct_option || selectedOption,
                        option_a: questionData.option_a || "",
                        option_b: questionData.option_b || "",
                        option_c: questionData.option_c || "",
                        option_d: questionData.option_d || "",
                        exam: questionData.exam || null,
                        subject: questionData.subject || null,
                        topic: questionData.topic || questionData.topic_tag || null,
                        year: questionData.year || null,
                        language: language || "en",
                        // Include question_id for cache key
                        question_id: questionData.id || questionData.question_id || questionData.json_question_id || null,
                        id: questionData.id || questionData.question_id || questionData.json_question_id || null,
                        json_question_id: questionData.json_question_id || questionData.question_id || questionData.id || null,
                    };
                } else {
                    endpoint = buildApiUrl("explain_option");
                    body = {
                        question_text: questionData.question_text,
                        selected_option: selectedOption,
                        correct_option: questionData.correct_option || "",
                        option_a: questionData.option_a || "",
                        option_b: questionData.option_b || "",
                        option_c: questionData.option_c || "",
                        option_d: questionData.option_d || "",
                        exam: questionData.exam || null,
                        subject: questionData.subject || null,
                        topic: questionData.topic || questionData.topic_tag || null,
                        year: questionData.year || null,
                        language: language || "en",
                        // Include question_id for cache key
                        question_id: questionData.id || questionData.question_id || questionData.json_question_id || null,
                        id: questionData.id || questionData.question_id || questionData.json_question_id || null,
                        json_question_id: questionData.json_question_id || questionData.question_id || questionData.id || null,
                    };
                }
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            // Check for errors in response
            if (data.error) {
                throw new Error(data.error);
            }

            // Extract explanation and cache tracking info
            let explanationText = "";
            if (explanationType === "concept") {
                explanationText = data.explanation || "Explanation not available.";
            } else if (explanationType === "option") {
                if (isCorrect) {
                    explanationText = data.explanation || "Explanation not available.";
                } else {
                    explanationText = data.reason || "Explanation not available.";
                }
            }
            
            setExplanation(explanationText);
            
            // Track cache status
            setFromCache(data.from_cache || false);
            setCacheKey(data.cache_key || "");
            setSource(data.source || "");
            
            // Log cache status for debugging
            if (data.from_cache) {
                console.log(`✅ Cache HIT: ${data.cache_key} (${data.source}) - No tokens used!`);
            } else {
                console.log(`🔄 Cache MISS: ${data.cache_key || 'N/A'} (${data.source}) - API call made`);
            }
        } catch (err) {
            setError("Failed to load explanation. Please try again.");
            console.error("Explanation fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper function to extract question ID
    const getQuestionId = () => {
        if (!questionData) return null;
        return questionData.id || questionData.question_id || questionData.json_question_id || null;
    };

    // Helper function to extract option letter (A, B, C, D)
    const getOptionLetter = () => {
        if (!selectedOption || !questionData) return null;
        
        const optionText = String(selectedOption).trim();
        if (!optionText || optionText === "(No option provided)") return null;

        // Match selectedOption text against each option
        const options = {
            'A': questionData.option_a,
            'B': questionData.option_b,
            'C': questionData.option_c,
            'D': questionData.option_d
        };

        for (const [letter, optionValue] of Object.entries(options)) {
            if (optionValue && String(optionValue).trim() === optionText) {
                return letter;
            }
        }

        // If no match found, try to extract from correct_option if it's a letter
        if (questionData.correct_option) {
            const correctOpt = String(questionData.correct_option).trim().toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(correctOpt)) {
                return correctOpt;
            }
        }

        return null;
    };

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
                className="explanation-backdrop md:hidden z-30"
                onClick={onClose}
            />

            {/* Explanation Window */}
            <div className={`explanation-window ${isMinimized ? 'explanation-window-minimized' : ''} z-50 md:z-40`}>
                {/* Header */}
                <div className="explanation-header" style={getHeaderStyle()}>
                    <h3 className="explanation-title">{getTitle()}</h3>
                    <div className="explanation-header-buttons">
                        {/* Save Explanation Button in Header */}
                        {!isMinimized && explanation && questionData && (
                            <div className="explanation-save-btn-wrapper">
                                <SaveNoteButton
                                    noteType="explanation"
                                    questionData={questionData}
                                    explanationText={explanation}
                                    explanationType={explanationType}
                                    optionLetter={getOptionLetter()}
                                    isCorrect={isCorrect}
                                    size="small"
                                    showLabel={false}
                                    className="explanation-save-btn hover:bg-white/20 !text-white !bg-transparent !border-white/30"
                                    onSaveSuccess={() => {
                                        console.log("Explanation saved successfully");
                                    }}
                                    onSaveError={(error) => {
                                        console.error("Failed to save explanation:", error);
                                    }}
                                />
                            </div>
                        )}
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
                        <>
                            {/* Cache Status Badge (Admin Only - for debugging) */}
                            {isAdmin && fromCache && (
                                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
                                    <span>💾</span>
                                    <span>Cached response (No tokens used)</span>
                                    {cacheKey && (
                                        <span className="text-xs text-green-600 ml-auto font-mono">
                                            {cacheKey}
                                        </span>
                                    )}
                                </div>
                            )}
                            {isAdmin && !fromCache && source === "llm_api" && (
                                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center gap-2">
                                    <span>🔄</span>
                                    <span>
                                        Fresh LLM response
                                        {getQuestionId() && (
                                            explanationType === "concept" 
                                                ? ` (Q: ${getQuestionId()})`
                                                : ` (Q: ${getQuestionId()}${getOptionLetter() ? `, Option: ${getOptionLetter()}` : ''})`
                                        )}
                                    </span>
                                </div>
                            )}
                            
                            {/* Context Header - for all users */}
                            {getQuestionId() && (
                                <div className="mb-2 text-xs text-gray-500 font-medium">
                                    {explanationType === "concept" 
                                        ? `Question #${getQuestionId()} - Concept Explanation`
                                        : `Question #${getQuestionId()} - Option ${getOptionLetter() || '?'} Explanation`
                                    }
                                </div>
                            )}
                            
                            <div className="explanation-text">
                                {explanation ? (
                                    <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: formatMarkdown(explanation),
                                        }}
                                    />
                                ) : (
                                    <p className="text-gray-500">
                                        No explanation available.
                                    </p>
                                )}
                            </div>
                            
                            {/* Save Explanation Button at Bottom */}
                            {explanation && questionData && (
                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                    <SaveNoteButton
                                        noteType="explanation"
                                        questionData={questionData}
                                        explanationText={explanation}
                                        explanationType={explanationType}
                                        optionLetter={getOptionLetter()}
                                        isCorrect={isCorrect}
                                        size="default"
                                        showLabel={true}
                                        onSaveSuccess={() => {
                                            console.log("Explanation saved successfully");
                                        }}
                                        onSaveError={(error) => {
                                            console.error("Failed to save explanation:", error);
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
                )}
            </div>
        </>
    );
}

