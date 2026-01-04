// src/components/exam/ExamInterface.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SubmitConfirmation from "./SubmitConfirmation";
import QuestionPaperView from "./QuestionPaperView";
import { getUserData } from "../../utils/auth";
import { useLanguage } from "../../contexts/LanguageContext";
import SaveNoteButton from "../SaveNoteButton";
import { buildApiUrl } from "../../config/apiConfig";
import { useMobileDetection } from "../../utils/useMobileDetection";

export default function ExamInterface() {
    const navigate = useNavigate();
    const { attemptId } = useParams();
    const isMobile = useMobileDetection();
    const [examData, setExamData] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState({});
    const [markedForReview, setMarkedForReview] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [timeSpentOnQuestion, setTimeSpentOnQuestion] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showQuestionPaper, setShowQuestionPaper] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [userData, setUserData] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [examLanguage, setExamLanguage] = useState("en"); // Language from exam attempt (not global context)
    const [sidebarTab, setSidebarTab] = useState("grid"); // "grid", "list", "instructions"
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    
    const timerIntervalRef = useRef(null);
    const questionTimerRef = useRef(null);
    const sidebarRef = useRef(null);

    useEffect(() => {
        const user = getUserData();
        setUserData(user);
    }, []);

    // Fetch exam attempt data
    useEffect(() => {
        const fetchExamAttempt = async () => {
            try {
                setLoading(true);
                // Use exam's stored language (from instructions page), not global context
                const response = await fetch(buildApiUrl(`exam/attempt/${attemptId}`), {
                    credentials: "include",
                    headers: {
                        "Accept": "application/json"
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch exam attempt");
                }
                
                // Check if response is actually JSON
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    console.error("❌ [ExamInterface] Response is not JSON:", contentType, text.substring(0, 200));
                    throw new Error("Server returned invalid response format. Please try again.");
                }
                
                const data = await response.json();
                setExamData(data);
                
                // Get language from attempt (stored when exam was started)
                // Use language from attempt, not from global context
                const attemptLanguage = data.language || "en";
                setExamLanguage(attemptLanguage);
                
                // Initialize selected options and marked for review from responses
                const options = {};
                const marked = {};
                data.questions.forEach((q, idx) => {
                    if (q.response?.selected_option) {
                        options[q.question_id] = q.response.selected_option;
                    }
                    if (q.response?.is_marked_for_review) {
                        marked[q.question_id] = true;
                    }
                });
                setSelectedOptions(options);
                setMarkedForReview(marked);
                
                // Calculate time remaining
                const durationSeconds = data.exam_set.duration_minutes * 60;
                const elapsed = data.time_spent_seconds || 0;
                setTimeRemaining(Math.max(0, durationSeconds - elapsed));
                
                setQuestionStartTime(Date.now());
                
                // Enter fullscreen when exam loads
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {
                        // User denied fullscreen or browser doesn't support it
                    });
                    setIsFullscreen(true);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        if (attemptId) {
            fetchExamAttempt();
        }
        
        // Listen for fullscreen changes
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [attemptId]);

    // Timer countdown
    useEffect(() => {
        if (!examData || isPaused || timeRemaining <= 0) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (timeRemaining <= 0 && examData) {
                handleAutoSubmit();
            }
            return;
        }

        timerIntervalRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [examData, isPaused, timeRemaining]);

    // Question timer
    useEffect(() => {
        if (!examData || isPaused) {
            if (questionTimerRef.current) {
                clearInterval(questionTimerRef.current);
            }
            return;
        }

        questionTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
            setTimeSpentOnQuestion(elapsed);
        }, 1000);

        return () => {
            if (questionTimerRef.current) {
                clearInterval(questionTimerRef.current);
            }
        };
    }, [examData, currentQuestionIndex, isPaused, questionStartTime]);

    // Reset question timer when question changes
    useEffect(() => {
        setQuestionStartTime(Date.now());
        setTimeSpentOnQuestion(0);
    }, [currentQuestionIndex]);

    // Translate questions on-demand when user navigates (prevents translating all 100+ questions at once)
    useEffect(() => {
        if (!examData || !examData.questions || examLanguage !== "hi") {
            return; // Only translate if Hindi mode
        }

        // Translate current question + next 2 questions (for smooth navigation)
        const questionsToTranslate = [];
        const translateBatchSize = 3; // Current + next 2
        
        for (let i = 0; i < translateBatchSize && (currentQuestionIndex + i) < examData.questions.length; i++) {
            const question = examData.questions[currentQuestionIndex + i];
            // Check if already translated (has Hindi text or is in English)
            // If question_text contains Devanagari characters, it's likely already translated
            const isTranslated = /[\u0900-\u097F]/.test(question.question_text);
            if (!isTranslated) {
                questionsToTranslate.push(question.question_id);
            }
        }

        // Translate on-demand
        if (questionsToTranslate.length > 0) {
            const translateQuestions = async () => {
                try {
                    const response = await fetch(buildApiUrl(`exam/attempt/${attemptId}/translate-questions`), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            question_ids: questionsToTranslate
                        })
                    });

                    if (response.ok) {
                        // Check if response is actually JSON
                        const contentType = response.headers.get("content-type");
                        if (!contentType || !contentType.includes("application/json")) {
                            console.warn("⚠️ [ExamInterface] Translate response is not JSON, skipping");
                            return;
                        }
                        const data = await response.json();
                        const translations = data.translations || {};

                        // Update examData with translations
                        setExamData(prevData => {
                            if (!prevData || !prevData.questions) return prevData;
                            
                            const updatedQuestions = prevData.questions.map(q => {
                                const translation = translations[q.question_id];
                                if (translation) {
                                    return {
                                        ...q,
                                        question_text: translation.question_text || q.question_text,
                                        option_a: translation.option_a || q.option_a,
                                        option_b: translation.option_b || q.option_b,
                                        option_c: translation.option_c || q.option_c,
                                        option_d: translation.option_d || q.option_d,
                                    };
                                }
                                return q;
                            });

                            return {
                                ...prevData,
                                questions: updatedQuestions
                            };
                        });
                    }
                } catch (error) {
                    // Silently fail - questions will remain in English
                    console.error("Failed to translate questions:", error);
                }
            };

            translateQuestions();
        }
    }, [currentQuestionIndex, examData, examLanguage, attemptId]);

    // Background translation: Translate next 2 questions while user is reading current question
    useEffect(() => {
        if (!examData || !examData.questions || examLanguage !== "hi") {
            return; // Only translate if Hindi mode
        }

        // Wait a bit before starting background translation (user is reading)
        const backgroundTranslateTimer = setTimeout(() => {
            // Translate next 2 questions (after the ones already being translated)
            const questionsToTranslate = [];
            const backgroundBatchSize = 2; // Next 2 questions
            const startIndex = currentQuestionIndex + 3; // Skip current + next 2 (already handled above)
            
            for (let i = 0; i < backgroundBatchSize && (startIndex + i) < examData.questions.length; i++) {
                const question = examData.questions[startIndex + i];
                // Check if already translated
                const isTranslated = /[\u0900-\u097F]/.test(question.question_text);
                if (!isTranslated) {
                    questionsToTranslate.push(question.question_id);
                }
            }

            // Silently translate in background
            if (questionsToTranslate.length > 0) {
                fetch(buildApiUrl(`exam/attempt/${attemptId}/translate-questions`), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        question_ids: questionsToTranslate
                    })
                })
                .then(async response => {
                    if (response.ok) {
                        // Check if response is actually JSON
                        const contentType = response.headers.get("content-type");
                        if (!contentType || !contentType.includes("application/json")) {
                            console.warn("⚠️ [ExamInterface] Background translate response is not JSON");
                            return null;
                        }
                        return response.json();
                    }
                    return null;
                })
                .then(data => {
                    if (data && data.translations) {
                        // Update examData with background translations
                        setExamData(prevData => {
                            if (!prevData || !prevData.questions) return prevData;
                            
                            const updatedQuestions = prevData.questions.map(q => {
                                const translation = data.translations[q.question_id];
                                if (translation) {
                                    return {
                                        ...q,
                                        question_text: translation.question_text || q.question_text,
                                        option_a: translation.option_a || q.option_a,
                                        option_b: translation.option_b || q.option_b,
                                        option_c: translation.option_c || q.option_c,
                                        option_d: translation.option_d || q.option_d,
                                    };
                                }
                                return q;
                            });

                            return {
                                ...prevData,
                                questions: updatedQuestions
                            };
                        });
                    }
                })
                .catch(error => {
                    // Silently fail - background translation is non-critical
                });
            }
        }, 1500); // Wait 2 seconds after question load before background translation

        return () => {
            clearTimeout(backgroundTranslateTimer);
        };
    }, [currentQuestionIndex, examData, examLanguage, attemptId]);

    const handleAutoSubmit = async () => {
        if (examData && examData.status === "in_progress") {
            await handleSubmit();
        }
    };

    const handleOptionSelect = async (option) => {
        if (!examData || examData.status !== "in_progress") return;
        
        const currentQuestion = examData.questions[currentQuestionIndex];
        const questionId = currentQuestion.question_id;
        
        setSelectedOptions((prev) => ({
            ...prev,
            [questionId]: option
        }));

        // Save to backend
        try {
            await fetch(buildApiUrl(`exam/attempt/${attemptId}/answer`), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_id: questionId,
                    selected_option: option,
                    is_marked_for_review: markedForReview[questionId] || false
                })
            });
        } catch (err) {
            console.error("Failed to save answer:", err);
        }
    };

    const handleMarkForReview = async () => {
        if (!examData || examData.status !== "in_progress") return;
        
        const currentQuestion = examData.questions[currentQuestionIndex];
        const questionId = currentQuestion.question_id;
        const newMarkedState = !markedForReview[questionId];
        
        setMarkedForReview((prev) => ({
            ...prev,
            [questionId]: newMarkedState
        }));

        try {
            await fetch(buildApiUrl(`exam/attempt/${attemptId}/mark-review?question_id=${questionId}&is_marked=${newMarkedState}`), {
                method: "POST",
                credentials: "include"
            });
        } catch (err) {
            console.error("Failed to mark for review:", err);
        }
    };

    const handleSaveAndNext = () => {
        if (currentQuestionIndex < examData.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleMarkForReviewAndNext = async () => {
        await handleMarkForReview();
        handleSaveAndNext();
    };

    const handleClearResponse = async () => {
        if (!examData || examData.status !== "in_progress") return;
        
        const currentQuestion = examData.questions[currentQuestionIndex];
        const questionId = currentQuestion.question_id;
        
        setSelectedOptions((prev) => {
            const newOptions = { ...prev };
            delete newOptions[questionId];
            return newOptions;
        });

        try {
            await fetch(buildApiUrl(`exam/attempt/${attemptId}/answer`), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    question_id: questionId,
                    selected_option: null,
                    is_marked_for_review: markedForReview[questionId] || false
                })
            });
        } catch (err) {
            console.error("Failed to clear response:", err);
        }
    };

    const handleQuestionNavigation = (index) => {
        setCurrentQuestionIndex(index);
    };

    const handleSubmit = async () => {
        try {
            const response = await fetch(buildApiUrl(`exam/attempt/${attemptId}/submit`), {
                method: "POST",
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to submit exam");
            }

            // Check if response is actually JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("❌ [ExamInterface] Submit response is not JSON:", contentType, text.substring(0, 200));
                throw new Error("Server returned invalid response format. Please try again.");
            }

            const data = await response.json();
            navigate(`/exam/${attemptId}/results`);
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
        setIsFullscreen(!isFullscreen);
    };

    const handleExitExam = () => {
        setShowExitModal(true);
    };

    const confirmExit = () => {
        // Exit fullscreen if in fullscreen mode
        if (isFullscreen) {
            document.exitFullscreen?.();
        }
        // Navigate back to exam mode page
        navigate("/exam-mode");
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
    };

    const getQuestionStatus = (questionId, index) => {
        const hasAnswer = selectedOptions[questionId] !== undefined;
        const isMarked = markedForReview[questionId] || false;
        const isCurrent = index === currentQuestionIndex;
        
        if (isCurrent) {
            return "current";
        }
        if (hasAnswer && isMarked) {
            return "answered-marked";
        }
        if (hasAnswer) {
            return "answered";
        }
        if (isMarked) {
            return "marked";
        }
        return "not-visited";
    };

    // Swipe gesture handlers for mobile sidebar
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isMobile) {
            if (isLeftSwipe && !isSidebarCollapsed) {
                // Swipe left to close sidebar
                setIsSidebarCollapsed(true);
            } else if (isRightSwipe && isSidebarCollapsed && touchStart < 50) {
                // Swipe from left edge to open sidebar
                setIsSidebarCollapsed(false);
            }
        }
    };

    // Handle sidebar toggle for mobile
    useEffect(() => {
        if (isMobile) {
            // On mobile, sidebar starts collapsed
            setIsSidebarCollapsed(true);
        } else {
            // On desktop, sidebar starts open
            setIsSidebarCollapsed(false);
        }
    }, [isMobile]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-4">Loading exam...</p>
                </div>
            </div>
        );
    }

    if (error || !examData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg">{error || "Exam not found"}</p>
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

    const currentQuestion = examData.questions[currentQuestionIndex];
    const totalQuestions = examData.questions.length;
    const answeredCount = Object.keys(selectedOptions).length;
    const markedCount = Object.keys(markedForReview).length;
    const notVisitedCount = totalQuestions - Object.keys(selectedOptions).length;
    const notAnsweredCount = totalQuestions - answeredCount;
    const markedAndAnsweredCount = Object.keys(markedForReview).filter(
        qId => selectedOptions[qId] !== undefined
    ).length;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg flex-shrink-0 z-50">
                <div className="w-full px-3 md:px-6 py-2 md:py-4">
                    {/* Mobile Header */}
                    {isMobile ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-bold">📝</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-base font-bold truncate">AI PYQ Assistant</h1>
                                        <p className="text-xs text-blue-100 opacity-95 truncate">
                                            {examData?.exam_set?.exam_type === "pyp" ? "PYQ Test" :
                                             examData?.exam_set?.exam_type === "mock_test" ? "Mock Test" :
                                             examData?.exam_set?.exam_type === "subject_test" ? "Subject Test" :
                                             "Exam Mode"}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-base md:text-xl font-bold flex-shrink-0 ${timeRemaining < 300 ? "text-red-200" : "text-white"}`}>
                                    {formatTime(timeRemaining)}
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs truncate flex-1 min-w-0">{examData?.exam_set?.name}</div>
                                <button
                                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                                    className="px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-semibold transition-all flex-shrink-0"
                                >
                                    {showMobileMenu ? "Hide" : "Menu"}
                                </button>
                            </div>
                            {/* Mobile Menu Dropdown */}
                            {showMobileMenu && (
                                <div className="bg-blue-700 rounded-lg p-2 space-y-1">
                                    <button
                                        onClick={() => {
                                            setFontSize(Math.max(12, fontSize - 2));
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-semibold transition-all"
                                    >
                                        Zoom (-)
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFontSize(Math.min(24, fontSize + 2));
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-semibold transition-all"
                                    >
                                        Zoom (+)
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsPaused(!isPaused);
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-semibold transition-all"
                                    >
                                        {isPaused ? "Resume" : "Pause"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleExitExam();
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs font-semibold transition-all"
                                    >
                                        Exit
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Desktop Header */
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                    <span className="text-xl font-bold">📝</span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">AI PYQ Assistant</h1>
                                    <p className="text-sm text-blue-100 opacity-95">
                                        {examData?.exam_set?.exam_type === "pyp" ? "PYQ Test" :
                                         examData?.exam_set?.exam_type === "mock_test" ? "Mock Test" :
                                         examData?.exam_set?.exam_type === "subject_test" ? "Subject Test" :
                                         "Exam Mode"}
                                    </p>
                                </div>
                                <span className="text-blue-200 mx-2">|</span>
                                <span className="text-base font-semibold truncate max-w-xl">{examData?.exam_set?.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                                    className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-base font-semibold transition-all"
                                >
                                    Zoom (-)
                                </button>
                                <button
                                    onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                                    className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-base font-semibold transition-all"
                                >
                                    Zoom (+)
                                </button>
                                <button
                                    onClick={toggleFullscreen}
                                    className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-base font-semibold transition-all"
                                >
                                    {isFullscreen ? "Exit Fullscreen" : "Switch Full Screen"}
                                </button>
                                <button
                                    onClick={() => setIsPaused(!isPaused)}
                                    className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-base font-semibold transition-all"
                                >
                                    {isPaused ? "Resume" : "Pause"}
                                </button>
                                <button
                                    onClick={handleExitExam}
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-base font-semibold transition-all flex items-center gap-2"
                                    title="Exit Exam"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Exit
                                </button>
                                <div className={`text-xl font-bold ${timeRemaining < 300 ? "text-red-200" : "text-white"}`}>
                                    Time Left {formatTime(timeRemaining)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex relative" style={{ height: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 73px)' }}>
                {/* Main Content */}
                <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? '' : ''}`}>
                    {/* Question Area */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-24" style={{ fontSize: `${fontSize}px` }}>
                        {currentQuestion && (
                            <div>
                                <div className={`mb-4 flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'}`}>
                                    <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}>
                                        Question No. {currentQuestionIndex + 1}
                                    </h2>
                                    <div className={`flex items-center ${isMobile ? 'gap-2.5 flex-wrap text-xs' : 'gap-4 text-sm'}`}>
                                        <span className="text-green-600 font-semibold whitespace-nowrap">
                                            {isMobile ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-gray-600">Marks:</span>
                                                    <span className="text-green-600">+{examData.exam_set.marks_per_question}</span>
                                                </span>
                                            ) : (
                                                `Marks +${examData.exam_set.marks_per_question}`
                                            )}
                                        </span>
                                        <span className="text-red-600 font-semibold whitespace-nowrap">
                                            {isMobile ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-gray-600">Neg:</span>
                                                    <span className="text-red-600">-{examData.exam_set.negative_marking}</span>
                                                </span>
                                            ) : (
                                                `-${examData.exam_set.negative_marking}`
                                            )}
                                        </span>
                                        <span className="text-gray-600 whitespace-nowrap">
                                            {isMobile ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-gray-600">Time:</span>
                                                    <span>{formatTime(timeSpentOnQuestion)}</span>
                                                </span>
                                            ) : (
                                                `Time ${formatTime(timeSpentOnQuestion)}`
                                            )}
                                        </span>
                                        {!isMobile && (
                                            <>
                                                <select 
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                                    value={examLanguage === "hi" ? "Hindi" : "English"}
                                                    disabled
                                                    title="Language selected in instructions (can be changed per question in future)"
                                                >
                                                    <option value="English">English</option>
                                                    <option value="Hindi">Hindi</option>
                                                </select>
                                                <SaveNoteButton
                                                    noteType="question"
                                                    questionData={{
                                                        id: currentQuestion.question_id,
                                                        question_id: currentQuestion.question_id,
                                                        json_question_id: currentQuestion.question_id,
                                                        question_text: currentQuestion.question_text,
                                                        option_a: currentQuestion.option_a,
                                                        option_b: currentQuestion.option_b,
                                                        option_c: currentQuestion.option_c,
                                                        option_d: currentQuestion.option_d,
                                                        correct_option: currentQuestion.correct_option,
                                                        exam: examData?.exam_set?.exam_name || "",
                                                        year: currentQuestion.year || "",
                                                        subject: currentQuestion.subject || "",
                                                        topic: currentQuestion.topic || "",
                                                    }}
                                                    size="small"
                                                    showLabel={true}
                                                    className="px-2 py-1 text-sm"
                                                />
                                                <button className="px-2 py-1 text-blue-600 hover:underline text-sm">
                                                    ▲ Report
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Divider below Question Header */}
                                <div className={`border-b-2 border-gray-200 mb-4 ${isMobile ? '-mx-3' : '-mx-6'}`} style={{ 
                                    marginRight: isMobile ? '-0.75rem' : (isSidebarCollapsed ? '-1.5rem' : 'calc(-1.5rem - 320px)')
                                }}></div>

                                <div className="mb-6">
                                    <p className="text-lg text-gray-800 leading-relaxed">
                                        {currentQuestion.question_text}
                                    </p>
                                </div>

                                <div className="space-y-2 mb-6">
                                    {['A', 'B', 'C', 'D'].map((option) => {
                                        const optionKey = `option_${option.toLowerCase()}`;
                                        const optionText = currentQuestion[optionKey];
                                        const isSelected = selectedOptions[currentQuestion.question_id] === option;
                                        
                                        return (
                                            <label
                                                key={option}
                                                className={`flex items-start gap-3 p-3 rounded cursor-pointer transition-all ${
                                                    isSelected
                                                        ? "bg-blue-50"
                                                        : "hover:bg-gray-100"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${currentQuestion.question_id}`}
                                                    value={option}
                                                    checked={isSelected}
                                                    onChange={() => handleOptionSelect(option)}
                                                    className="mt-1 w-5 h-5 text-blue-600"
                                                />
                                                <span className="font-semibold text-gray-700 mr-2">{option}.</span>
                                                <span className="flex-1 text-gray-800">{optionText || `Option ${option}`}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fixed Action Buttons at Bottom */}
                    <div className={`fixed bottom-0 bg-white shadow-lg z-40 transition-all duration-300 border-t-2 border-gray-200 ${
                        isMobile ? 'left-0 right-0 w-full' : (isSidebarCollapsed ? 'left-0 right-0 w-full' : 'left-0 right-80 w-[calc(100%-320px)]')
                    }`}>
                        <div className="px-3 md:px-6 py-3 md:py-4">
                            {isMobile ? (
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleSaveAndNext}
                                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Save & Next
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleMarkForReviewAndNext}
                                            className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors text-sm"
                                        >
                                            Mark & Next
                                        </button>
                                        <button
                                            onClick={handleClearResponse}
                                            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleMarkForReviewAndNext}
                                        className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
                                    >
                                        Mark for Review & Next
                                    </button>
                                    <button
                                        onClick={handleClearResponse}
                                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Clear Response
                                    </button>
                                    <button
                                        onClick={handleSaveAndNext}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Save & Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collapse/Expand Button - Desktop Only */}
                {!isMobile && (
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`absolute top-1/2 -translate-y-1/2 z-50 bg-blue-600 text-white px-3 py-4 rounded-l-lg shadow-lg hover:bg-blue-700 transition-all duration-300 ${
                            isSidebarCollapsed ? 'right-0' : 'right-80'
                        }`}
                        title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
                    >
                        {isSidebarCollapsed ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Mobile Sidebar Toggle Button - Floating Action Button */}
                {isMobile && (
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="fixed bottom-24 right-4 z-50 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center"
                        title="Question Palette"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </button>
                )}

                {/* Right Sidebar - Question Palette */}
                <AnimatePresence>
                    {!isSidebarCollapsed && (
                        <>
                            {/* Mobile Overlay */}
                            {isMobile && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                                />
                            )}
                            
                            <motion.div
                                ref={sidebarRef}
                                initial={isMobile ? { x: '100%' } : false}
                                animate={isMobile ? { x: 0 } : false}
                                exit={isMobile ? { x: '100%' } : false}
                                transition={{ type: 'tween', duration: 0.3 }}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                className={`${isMobile ? 'fixed right-0 top-0 h-full z-50' : ''} w-80 bg-gray-50 border-l border-gray-300 p-4 flex flex-col overflow-hidden transition-all duration-300`}
                            >
                                {/* Tabs - Mobile Only */}
                                {isMobile && (
                                    <div className="flex border-b border-gray-300 mb-3 flex-shrink-0">
                                        <button
                                            onClick={() => setSidebarTab("grid")}
                                            className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors relative ${
                                                sidebarTab === "grid"
                                                    ? "text-gray-900"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            Grid View
                                            {sidebarTab === "grid" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSidebarTab("list");
                                                // On mobile, show inline list view; on desktop, open modal
                                                if (!isMobile) {
                                                    setShowQuestionPaper(true);
                                                }
                                            }}
                                            className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors relative ${
                                                sidebarTab === "list"
                                                    ? "text-gray-900"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            List View
                                            {sidebarTab === "list" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSidebarTab("instructions");
                                                setShowInstructions(true);
                                            }}
                                            className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors relative ${
                                                sidebarTab === "instructions"
                                                    ? "text-gray-900"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            Instructions
                                            {sidebarTab === "instructions" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></div>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* User Profile - Desktop Only */}
                                {userData && !isMobile && (
                                    <>
                                        <div className="mb-3 flex items-center gap-3 flex-shrink-0">
                                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                                {userData.username?.[0]?.toUpperCase() || "U"}
                                            </div>
                                            <div className="text-base font-semibold text-gray-700 truncate">{userData.username || "User"}</div>
                                        </div>
                                        <div className="border-b-2 border-gray-300 mb-3 flex-shrink-0"></div>
                                    </>
                                )}

                                {/* View Instructions Link - Mobile Only */}
                                {isMobile && (
                                    <div className="mb-3 flex items-center gap-2 text-xs text-gray-600 flex-shrink-0">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <button
                                            onClick={() => {
                                                setSidebarTab("instructions");
                                                setShowInstructions(true);
                                            }}
                                            className="hover:underline"
                                        >
                                            View Instructions
                                        </button>
                                    </div>
                                )}

                                {/* List View Tab Content - Mobile Only */}
                                {isMobile && sidebarTab === "list" && (
                                    <div className="flex-1 overflow-y-auto mb-4">
                                        <div className="space-y-2">
                                            {examData.questions.map((question, index) => {
                                                const status = getQuestionStatus(question.question_id, index);
                                                const isCurrent = index === currentQuestionIndex;
                                                const bgColor = {
                                                    "current": "bg-blue-500 text-white border-2 border-blue-700",
                                                    "answered": "bg-green-500 text-white",
                                                    "marked": "bg-purple-500 text-white",
                                                    "answered-marked": "bg-purple-500 text-white border-2 border-green-500",
                                                    "not-visited": "bg-white text-gray-700 border-2 border-gray-400"
                                                }[status] || "bg-white text-gray-700 border-2 border-gray-400";
                                                
                                                return (
                                                    <button
                                                        key={question.question_id}
                                                        onClick={() => {
                                                            handleQuestionNavigation(index);
                                                            setIsSidebarCollapsed(true);
                                                        }}
                                                        className={`w-full p-2.5 rounded text-left transition-all ${
                                                            isCurrent 
                                                                ? "bg-blue-50 border-2 border-blue-500" 
                                                                : "border border-gray-200 hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2.5">
                                                            <span className={`flex-shrink-0 w-7 h-7 rounded text-xs font-semibold flex items-center justify-center ${bgColor}`}>
                                                                {index + 1}
                                                            </span>
                                                            <p className="text-sm text-gray-700 line-clamp-2 flex-1 leading-relaxed">
                                                                {question.question_text}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Desktop: Always show content, Mobile: Show based on tab */}
                                {(!isMobile || sidebarTab === "grid") && (
                                    <>
                                        {/* Question Status Legend */}
                                        <div className="mb-4 text-xs space-y-2 flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                                <span>{answeredCount} Answered</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                                                <span>{markedCount} Marked</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
                                                <span>{notVisitedCount} Not Visited</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-green-500"></div>
                                                <span>{markedAndAnsweredCount} Marked and answered</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                                <span>{notAnsweredCount} Not Answered</span>
                                            </div>
                                        </div>

                                        {/* Divider between Status Legend and Question Palette */}
                                        <div className="border-b-2 border-gray-300 mb-3 flex-shrink-0"></div>

                                        {/* Question Palette Grid - All questions in one grid, no subject grouping */}
                                        <div className="question-palette-grid mb-4 flex-1 overflow-y-auto overflow-x-hidden" style={{ 
                                            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                                            gap: '0.5rem'
                                        }}>
                                            {examData.questions.map((question, index) => {
                                                const status = getQuestionStatus(question.question_id, index);
                                                const bgColor = {
                                                    "current": "bg-blue-500 text-white border-2 border-blue-700",
                                                    "answered": "bg-green-500 text-white",
                                                    "marked": "bg-purple-500 text-white",
                                                    "answered-marked": "bg-purple-500 text-white border-2 border-green-500",
                                                    "not-visited": "bg-white text-gray-700 border-2 border-gray-400"
                                                }[status] || "bg-white text-gray-700 border-2 border-gray-400";
                                                
                                                return (
                                                    <button
                                                        key={question.question_id}
                                                        onClick={() => {
                                                            handleQuestionNavigation(index);
                                                            if (isMobile) setIsSidebarCollapsed(true);
                                                        }}
                                                        className={`w-10 h-10 rounded text-sm font-semibold ${bgColor} hover:opacity-80 transition-opacity`}
                                                        style={{ 
                                                            margin: 0, 
                                                            padding: 0, 
                                                            lineHeight: '1', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            height: '2.5rem',
                                                            minHeight: '2.5rem',
                                                            maxHeight: '2.5rem',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        title={`Question ${index + 1}`}
                                                    >
                                                        {index + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                {/* Divider between Content and Action Buttons */}
                                <div className="border-t-2 border-gray-300 mb-3 flex-shrink-0"></div>

                                {/* Action Buttons - Desktop: Always show, Mobile: Show for Grid and List View tabs */}
                                {(!isMobile || sidebarTab === "grid" || sidebarTab === "list") && (
                                    <div className="space-y-2 flex-shrink-0">
                                        {!isMobile && (
                                            <>
                                                <button
                                                    onClick={() => setShowQuestionPaper(!showQuestionPaper)}
                                                    className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors text-sm"
                                                >
                                                    Question Paper
                                                </button>
                                                <button
                                                    onClick={() => setShowInstructions(true)}
                                                    className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors text-sm"
                                                >
                                                    Instructions
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => {
                                                setShowSubmitModal(true);
                                                if (isMobile) setIsSidebarCollapsed(true);
                                            }}
                                            className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                                        >
                                            Submit Test
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Submit Confirmation Modal */}
            <AnimatePresence>
                {showSubmitModal && (
                    <SubmitConfirmation
                        examData={examData}
                        selectedOptions={selectedOptions}
                        markedForReview={markedForReview}
                        onClose={() => setShowSubmitModal(false)}
                        onConfirm={handleSubmit}
                    />
                )}
            </AnimatePresence>

            {/* Question Paper View - Desktop Only (Mobile uses inline List View in sidebar) */}
            <AnimatePresence>
                {showQuestionPaper && !isMobile && (
                    <QuestionPaperView
                        questions={examData.questions}
                        currentIndex={currentQuestionIndex}
                        onClose={() => setShowQuestionPaper(false)}
                        onNavigate={handleQuestionNavigation}
                    />
                )}
            </AnimatePresence>

            {/* Instructions Modal */}
            <AnimatePresence>
                {showInstructions && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">Instructions</h2>
                                    <button
                                        onClick={() => setShowInstructions(false)}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="space-y-4 text-sm text-gray-700">
                                    <div>
                                        <h3 className="font-bold mb-2">General Instructions:</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-4">
                                            <li>The clock will be set at the server. The countdown timer displays the remaining time.</li>
                                            <li>When the timer reaches zero, the examination will end automatically.</li>
                                            <li>Use the Question Palette on the right to navigate between questions.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">Question Status Symbols:</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-4">
                                            <li><span className="inline-block w-4 h-4 border-2 border-gray-400 bg-white mr-2"></span>Not visited</li>
                                            <li><span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2"></span>Not answered</li>
                                            <li><span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2"></span>Answered</li>
                                            <li><span className="inline-block w-4 h-4 bg-purple-500 rounded-full mr-2"></span>Marked for review</li>
                                            <li><span className="inline-block w-4 h-4 bg-purple-500 rounded-full border-2 border-green-500 mr-2"></span>Answered and marked</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-2">Navigating Questions:</h3>
                                        <ul className="list-disc list-inside space-y-1 ml-4">
                                            <li>Click on question number in the palette to navigate directly (does NOT save answer).</li>
                                            <li>Click <strong>Save & Next</strong> to save your answer and move to next question.</li>
                                            <li>Click <strong>Mark for Review & Next</strong> to save and mark for review.</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setShowInstructions(false)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">Exit Exam?</h2>
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="mb-6">
                                    <p className="text-gray-700 mb-2">
                                        Are you sure you want to exit the exam? Your progress will be saved, but you will need to resume from where you left off.
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        You can continue this exam later from the Exam Mode page.
                                    </p>
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmExit}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                    >
                                        Exit Exam
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

