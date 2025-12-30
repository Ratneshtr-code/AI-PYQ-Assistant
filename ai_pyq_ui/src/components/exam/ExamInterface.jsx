// src/components/exam/ExamInterface.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import SubmitConfirmation from "./SubmitConfirmation";
import QuestionPaperView from "./QuestionPaperView";
import { getUserData } from "../../utils/auth";

const API_BASE_URL = "";

export default function ExamInterface() {
    const navigate = useNavigate();
    const { attemptId } = useParams();
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
    
    const timerIntervalRef = useRef(null);
    const questionTimerRef = useRef(null);

    useEffect(() => {
        const user = getUserData();
        setUserData(user);
    }, []);

    // Fetch exam attempt data
    useEffect(() => {
        const fetchExamAttempt = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}`, {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch exam attempt");
                }
                
                const data = await response.json();
                setExamData(data);
                
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
            await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/answer`, {
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
            await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/mark-review?question_id=${questionId}&is_marked=${newMarkedState}`, {
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
            await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/answer`, {
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
            const response = await fetch(`${API_BASE_URL}/exam/attempt/${attemptId}/submit`, {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to submit exam");
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
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 text-white shadow-lg flex-shrink-0 z-50">
                <div className="w-full px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <span className="text-xl font-bold">📝</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">AI PYQ Assistant</h1>
                                <p className="text-xs text-blue-200 opacity-90">Exam Mode</p>
                            </div>
                            <span className="text-blue-300 mx-2">|</span>
                            <span className="text-sm font-medium truncate max-w-xl">{examData.exam_set.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                                className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-all"
                            >
                                Zoom (-)
                            </button>
                            <button
                                onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                                className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-all"
                            >
                                Zoom (+)
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-all"
                            >
                                {isFullscreen ? "Exit Fullscreen" : "Switch Full Screen"}
                            </button>
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-medium transition-all"
                            >
                                {isPaused ? "Resume" : "Pause"}
                            </button>
                            <div className={`text-lg font-bold ${timeRemaining < 300 ? "text-red-300" : "text-white"}`}>
                                Time Left {formatTime(timeRemaining)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex relative" style={{ height: 'calc(100vh - 73px)' }}>
                {/* Main Content */}
                <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? '' : ''}`}>
                    {/* Question Area */}
                    <div className="flex-1 overflow-y-auto p-6 pb-24" style={{ fontSize: `${fontSize}px` }}>
                        {currentQuestion && (
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Question No. {currentQuestionIndex + 1}
                                    </h2>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-green-600 font-semibold">
                                            Marks +{examData.exam_set.marks_per_question}
                                        </span>
                                        <span className="text-red-600 font-semibold">
                                            -{examData.exam_set.negative_marking}
                                        </span>
                                        <span className="text-gray-600">
                                            Time {formatTime(timeSpentOnQuestion)}
                                        </span>
                                        <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                                            <option>English</option>
                                        </select>
                                        <button className="px-2 py-1 text-blue-600 hover:underline text-sm">
                                            ▲ Report
                                        </button>
                                    </div>
                                </div>

                                {/* Divider below Question Header */}
                                <div className="border-b-2 border-gray-200 mb-4 -mx-6" style={{ 
                                    marginRight: isSidebarCollapsed ? '-1.5rem' : 'calc(-1.5rem - 320px)' 
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
                    <div className="fixed bottom-0 bg-white shadow-lg z-40 transition-all duration-300" style={{ 
                        left: '0',
                        width: isSidebarCollapsed ? '100%' : 'calc(100% - 320px)', 
                        right: isSidebarCollapsed ? '0' : '320px',
                        borderTop: '2px solid #e5e7eb'
                    }}>
                        <div className="px-6 py-4">
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
                        </div>
                    </div>
                </div>

                {/* Collapse/Expand Button */}
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

                {/* Right Sidebar - Question Palette */}
                {!isSidebarCollapsed && (
                    <div className="w-80 bg-gray-50 border-l border-gray-300 p-4 flex flex-col overflow-hidden transition-all duration-300">
                        {/* User Profile */}
                        {userData && (
                            <div className="mb-3 flex items-center gap-3 flex-shrink-0">
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                    {userData.username?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div className="text-sm font-semibold text-gray-700 truncate">{userData.username || "User"}</div>
                            </div>
                        )}

                        {/* Divider between User Profile and Status Legend */}
                        <div className="border-b-2 border-gray-300 mb-3 flex-shrink-0"></div>

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
                        <div className="grid grid-cols-5 gap-1 mb-4 flex-1 overflow-y-auto overflow-x-hidden" style={{ rowGap: '0.25rem' }}>
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
                                        onClick={() => handleQuestionNavigation(index)}
                                        className={`w-10 h-10 rounded text-sm font-semibold ${bgColor} hover:opacity-80 transition-opacity`}
                                        title={`Question ${index + 1}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Divider between Question Palette and Action Buttons */}
                        <div className="border-t-2 border-gray-300 mb-3 flex-shrink-0"></div>

                        {/* Action Buttons */}
                        <div className="space-y-2 flex-shrink-0">
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
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors"
                            >
                                Submit Test
                            </button>
                        </div>
                    </div>
                )}
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

            {/* Question Paper View */}
            <AnimatePresence>
                {showQuestionPaper && (
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
        </div>
    );
}

