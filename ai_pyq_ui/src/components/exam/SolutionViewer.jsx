// src/components/exam/SolutionViewer.jsx
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { formatMarkdown } from "../../utils/formatMarkdown";
import { useLanguage } from "../../contexts/LanguageContext";

const API_BASE_URL = "";

export default function SolutionViewer({ solutions, currentQuestionId, onClose, onNavigate, examLanguage }) {
    const { language: globalLanguage } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [explanation, setExplanation] = useState(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [translatedQuestion, setTranslatedQuestion] = useState(null);
    const [loadingTranslation, setLoadingTranslation] = useState(false);
    // Use exam language if provided, otherwise fall back to global language, then "en"
    const [selectedLanguage, setSelectedLanguage] = useState(examLanguage || globalLanguage || "en");

    // Update selected language when examLanguage prop changes
    useEffect(() => {
        if (examLanguage) {
            setSelectedLanguage(examLanguage);
        }
    }, [examLanguage]);

    useEffect(() => {
        if (solutions && currentQuestionId) {
            const index = solutions.findIndex(s => s.question_id === currentQuestionId);
            if (index !== -1) {
                setCurrentIndex(index);
            }
        }
    }, [solutions, currentQuestionId]);

    // Store original English question per question_id to restore when switching back to English
    const originalEnglishQuestionsRef = useRef({});

    // Translate question and options when language or current question changes
    useEffect(() => {
        if (solutions && solutions[currentIndex]) {
            const currentQuestion = solutions[currentIndex];
            translateQuestion(currentQuestion);
            fetchExplanation(currentQuestion);
        }
    }, [currentIndex, solutions, selectedLanguage]);

    const translateQuestion = async (question) => {
        const questionId = question.question_id || question.id;
        const originalEnglish = originalEnglishQuestionsRef.current[questionId];
        
        // If language is English, use original English question from database or stored original
        if (selectedLanguage === "en" || !selectedLanguage || selectedLanguage.toLowerCase() === "english") {
            // Always call backend to get original English text from database
            // This handles the case where question might already be in Hindi
            setLoadingTranslation(true);
            try {
                const response = await fetch(`${API_BASE_URL}/translate_question`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        question_text: question.question_text || "",
                        option_a: question.option_a || "",
                        option_b: question.option_b || "",
                        option_c: question.option_c || "",
                        option_d: question.option_d || "",
                        question_id: questionId,
                        id: questionId,
                        json_question_id: questionId,
                        language: "en"  // Request English (backend will fetch from database)
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.error) {
                        console.error("Translation error:", data.error);
                        // Fallback to stored original or current question
                        setTranslatedQuestion(originalEnglish ? {
                            ...question,
                            ...originalEnglish
                        } : question);
                    } else {
                        // Always store the English text from backend (it's fetched from database)
                        // This ensures we have the correct English text even if exam was in Hindi
                        originalEnglishQuestionsRef.current[questionId] = {
                            question_text: data.question_text,
                            option_a: data.option_a,
                            option_b: data.option_b,
                            option_c: data.option_c,
                            option_d: data.option_d,
                        };
                        
                        // Validate that we got English text (check if it's different from the Hindi text we sent)
                        const receivedText = data.question_text || "";
                        const sentText = question.question_text || "";
                        
                        if (receivedText !== sentText) {
                            console.log("✅ Using English text from database (different from sent text) for question_id:", questionId);
                        } else {
                            console.warn("⚠️ Received text matches sent text - database lookup may have failed for question_id:", questionId, "Using anyway.");
                        }
                        
                        // Use the English text from backend
                        setTranslatedQuestion({
                            ...question,
                            question_text: data.question_text,
                            option_a: data.option_a,
                            option_b: data.option_b,
                            option_c: data.option_c,
                            option_d: data.option_d,
                        });
                    }
                } else {
                    console.error("Failed to fetch English text, status:", response.status);
                    // Fallback to stored original or current question
                    setTranslatedQuestion(originalEnglish ? {
                        ...question,
                        ...originalEnglish
                    } : question);
                }
            } catch (err) {
                console.error("Error fetching English text:", err);
                // Fallback to stored original or current question
                setTranslatedQuestion(originalEnglish ? {
                    ...question,
                    ...originalEnglish
                } : question);
            } finally {
                setLoadingTranslation(false);
            }
            return;
        }

        // For Hindi, translate from original English if available
        setLoadingTranslation(true);
        try {
            // Use original English question if available, otherwise use current question
            const sourceQuestion = originalEnglish || question;
            
            // Call backend translation endpoint
            const response = await fetch(`${API_BASE_URL}/translate_question`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_text: sourceQuestion.question_text || question.question_text || "",
                    option_a: sourceQuestion.option_a || question.option_a || "",
                    option_b: sourceQuestion.option_b || question.option_b || "",
                    option_c: sourceQuestion.option_c || question.option_c || "",
                    option_d: sourceQuestion.option_d || question.option_d || "",
                    question_id: questionId,
                    id: questionId,
                    json_question_id: questionId,
                    language: selectedLanguage
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.error) {
                    console.error("Translation error:", data.error);
                    setTranslatedQuestion(question);
                } else {
                    // Merge translated data with original question to preserve all fields
                    setTranslatedQuestion({
                        ...question,
                        question_text: data.question_text || question.question_text,
                        option_a: data.option_a || question.option_a,
                        option_b: data.option_b || question.option_b,
                        option_c: data.option_c || question.option_c,
                        option_d: data.option_d || question.option_d,
                    });
                    
                    // Store original English if we just translated and don't have it stored
                    if (!originalEnglish && sourceQuestion === question) {
                        originalEnglishQuestionsRef.current[questionId] = {
                            question_text: question.question_text,
                            option_a: question.option_a,
                            option_b: question.option_b,
                            option_c: question.option_c,
                            option_d: question.option_d,
                        };
                    }
                }
            } else {
                console.error("Translation request failed:", response.status);
                setTranslatedQuestion(question);
            }
        } catch (err) {
            console.error("Error translating question:", err);
            // On error, use original question
            setTranslatedQuestion(question);
        } finally {
            setLoadingTranslation(false);
        }
    };

    const fetchExplanation = async (question) => {
        setLoadingExplanation(true);
        try {
            // CRITICAL: Ensure question_id is always present for proper cache hits
            // Cache keys are based on question_id, not question text
            const questionId = question.question_id || question.id;
            
            if (!questionId) {
                console.error("⚠️ WARNING: question_id is missing! This will cause cache misses.", question);
                // Try to extract from other fields as fallback
                const fallbackId = question.json_question_id || question._id || null;
                if (fallbackId) {
                    console.warn("Using fallback question_id:", fallbackId);
                }
            }
            
            // Use original English question text for better prompt quality
            // (Cache keys are based on question_id, so this doesn't affect cache hits)
            const originalEnglish = originalEnglishQuestionsRef.current[questionId];
            const sourceQuestion = originalEnglish || question;
            
            // Ensure question_id is passed (use fallback if needed)
            const finalQuestionId = questionId || question.json_question_id || question._id || null;
            
            const response = await fetch(`${API_BASE_URL}/explain_concept`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_text: sourceQuestion.question_text || question.question_text,
                    option_a: sourceQuestion.option_a || question.option_a,
                    option_b: sourceQuestion.option_b || question.option_b,
                    option_c: sourceQuestion.option_c || question.option_c,
                    option_d: sourceQuestion.option_d || question.option_d,
                    correct_option: question.correct_option,
                    exam: question.exam,
                    subject: question.subject,
                    topic: question.topic,
                    year: question.year,
                    // CRITICAL: Always pass question_id for proper cache hits
                    question_id: finalQuestionId,
                    id: finalQuestionId,  // Also pass as 'id' for compatibility
                    json_question_id: finalQuestionId,  // Also pass as 'json_question_id' for compatibility
                    language: selectedLanguage  // Pass selected language for translation
                })
            });

            if (response.ok) {
                const data = await response.json();
                setExplanation(data.explanation || "");
            } else {
                setExplanation("Explanation not available.");
            }
        } catch (err) {
            console.error("Error fetching explanation:", err);
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
    // Use translated question if available, otherwise use original
    const displayQuestion = translatedQuestion || currentQuestion;
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
                        <select 
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                            value={selectedLanguage === "hi" ? "Hindi" : "English"}
                            onChange={(e) => {
                                const newLang = e.target.value === "Hindi" ? "hi" : "en";
                                setSelectedLanguage(newLang);
                            }}
                        >
                            <option value="English">English</option>
                            <option value="Hindi">Hindi</option>
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
                        {loadingTranslation ? (
                            <div className="flex items-center gap-2 text-gray-500">
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm">Translating...</span>
                            </div>
                        ) : (
                            <p className="text-gray-800 leading-relaxed">
                                {displayQuestion.question_text}
                            </p>
                        )}
                    </div>

                    {/* Options */}
                    <div className="mb-6 space-y-3">
                        {['A', 'B', 'C', 'D'].map((option) => {
                            const optionKey = `option_${option.toLowerCase()}`;
                            const optionText = displayQuestion[optionKey];
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

