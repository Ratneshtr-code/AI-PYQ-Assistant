// src/components/exam/ExamInstructions.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

const API_BASE_URL = "";

export default function ExamInstructions() {
    const navigate = useNavigate();
    const { examSetId } = useParams();
    const [examSet, setExamSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("");
    const [declarationChecked, setDeclarationChecked] = useState(false);
    const [starting, setStarting] = useState(false);
    const [currentPage, setCurrentPage] = useState("symbols"); // "symbols" or "instructions"
    const [languages, setLanguages] = useState([]);

    useEffect(() => {
        const fetchExamSet = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/exam/sets/${examSetId}`, {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch exam set");
                }
                
                const data = await response.json();
                setExamSet(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        if (examSetId) {
            fetchExamSet();
        }
    }, [examSetId]);

    // Fetch supported languages from backend
    useEffect(() => {
        const fetchLanguages = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/exam/languages`, {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch languages");
                }
                
                const data = await response.json();
                // Extract language names from the response
                const languageNames = data.languages.map(lang => lang.name);
                setLanguages(languageNames);
            } catch (err) {
                console.error("Error fetching languages:", err);
                // Fallback to default languages if API fails
                setLanguages(["English", "Hindi"]);
            }
        };
        
        fetchLanguages();
    }, []);

    const handleStartExam = async () => {
        if (!selectedLanguage) {
            alert("Please select a language");
            return;
        }
        
        if (!declarationChecked) {
            alert("Please accept the declaration to continue");
            return;
        }

        try {
            setStarting(true);
            const response = await fetch(`${API_BASE_URL}/exam/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    exam_set_id: parseInt(examSetId)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to start exam");
            }

            const data = await response.json();
            navigate(`/exam/${data.attempt_id}`);
        } catch (err) {
            alert(err.message);
            setStarting(false);
        }
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) {
            return `${minutes} Mins`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} Hr ${mins} Mins` : `${hours} Hr`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-4">Loading exam details...</p>
                </div>
            </div>
        );
    }

    if (error || !examSet) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg">{error || "Exam set not found"}</p>
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

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Premium Header - Fixed at top */}
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg flex-shrink-0 z-50 fixed top-0 left-0 right-0">
                <div className="w-full px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <span className="text-xl font-bold">📝</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">AI PYQ Assistant</h1>
                                <p className="text-sm text-blue-100 opacity-95">
                                    {examSet?.exam_type === "pyp" ? "PYQ Test" :
                                     examSet?.exam_type === "mock_test" ? "Mock Test" :
                                     examSet?.exam_type === "subject_test" ? "Subject Test" :
                                     "Exam Mode"}
                                </p>
                            </div>
                            <span className="text-blue-200 mx-2">|</span>
                            <span className="text-base font-semibold truncate max-w-xl">{examSet?.name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Flex layout with fixed header and footer */}
            <div className="flex-1 flex overflow-hidden mt-16 mb-20">
                {/* Left Content - 80% width, starts from extreme left */}
                <div className="w-4/5 flex flex-col">
                    {/* Scrollable content card */}
                    <div className={`flex-1 overflow-y-auto pl-6 pr-4 py-6 ${currentPage === "instructions" ? "scrollbar-hide" : ""}`}>
                        <motion.div
                            key={currentPage}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-lg shadow-md p-6"
                        >
                            {/* Content aligned to left */}
                            <div className="text-left">

                            {currentPage === "symbols" ? (
                                <div className="space-y-6 text-gray-800 text-left">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-left">General Instructions</h2>
                                        <div className="h-1 w-20 bg-blue-600 rounded"></div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm leading-relaxed text-gray-700 mb-4">
                                                <strong>1.</strong> The clock will be set at the server. The countdown timer in the top right corner of your screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm leading-relaxed text-gray-700 mb-3">
                                                <strong>2.</strong> The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                                            </p>
                                            <ul className="space-y-3 ml-6 mt-3">
                                                <li className="flex items-start gap-3">
                                                    <span className="inline-block w-5 h-5 border-2 border-gray-400 bg-white rounded mt-0.5 flex-shrink-0"></span>
                                                    <span className="text-sm text-gray-700">You have not visited the question yet.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="inline-block w-5 h-5 rounded-full bg-red-500 mt-0.5 flex-shrink-0"></span>
                                                    <span className="text-sm text-gray-700">You have not answered the question.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="inline-block w-5 h-5 rounded-full bg-green-500 mt-0.5 flex-shrink-0"></span>
                                                    <span className="text-sm text-gray-700">You have answered the question.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="inline-block w-5 h-5 rounded-full bg-purple-500 mt-0.5 flex-shrink-0"></span>
                                                    <span className="text-sm text-gray-700">You have NOT answered the question, but have marked the question for review.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <span className="inline-block w-5 h-5 rounded-full bg-purple-500 border-2 border-green-500 mt-0.5 flex-shrink-0"></span>
                                                    <span className="text-sm text-gray-700">You have answered the question, but marked it for review.</span>
                                                </li>
                                            </ul>
                                            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                                                <p className="text-sm text-gray-700">
                                                    The Mark For Review status for a question simply indicates that you would like to look at that question again. If a question is answered and Marked for Review, your answer for that question will be considered in the evaluation.
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-3">Navigating to a Question:</h3>
                                            <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed text-gray-700">
                                                <li>
                                                    To answer a question do the following:
                                                    <ol className="list-decimal list-inside ml-6 mt-2 space-y-2">
                                                        <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                                                        <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                                                        <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                                                    </ol>
                                                </li>
                                            </ol>
                                            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                                                <p className="text-sm text-gray-800">
                                                    <strong>Note:</strong> Your answer for the current question will not be saved, if you navigate to another question directly by clicking on a question number without saving the answer to the previous question.
                                                </p>
                                            </div>
                                            <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                                                <p className="text-sm text-red-800">
                                                    You can view all the questions by clicking on the <strong>Question Paper</strong> button. This feature is provided, so that if you want you can just see the entire question paper at a glance.
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-3">Answering a Question:</h3>
                                            <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed text-gray-700">
                                                <li>
                                                    Procedure for answering a multiple choice (MCQ) type question:
                                                    <ol className="list-decimal list-inside ml-6 mt-2 space-y-2">
                                                        <li>Choose one answer from the 4 options (A,B,C,D) given below the question, click on the bubble placed before the chosen option.</li>
                                                        <li>To deselect your chosen answer, click on the bubble of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                                                        <li>To change your chosen answer, click on the bubble of another option.</li>
                                                        <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
                                                    </ol>
                                                </li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 text-gray-800 text-left">
                                    {/* Exam Title */}
                                    <div className="mb-4">
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-left">
                                            {examSet.name}
                                        </h2>
                                        <div className="h-1 w-20 bg-blue-600 rounded"></div>
                                    </div>

                                    {/* Exam Details */}
                                    <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-200">
                                        <div>
                                            <span className="text-gray-600 text-sm">Duration:</span>
                                            <span className="ml-2 font-semibold text-gray-900 text-lg">
                                                {formatDuration(examSet.duration_minutes)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 text-sm">Maximum Marks:</span>
                                            <span className="ml-2 font-semibold text-gray-900 text-lg">
                                                {examSet.total_questions * examSet.marks_per_question}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="mb-4 text-left">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 text-left">
                                            Read the following instructions carefully.
                                        </h3>
                                        <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed text-sm text-left">
                                            <li>
                                                The test contains {examSet.total_questions} questions.
                                            </li>
                                            <li>
                                                Each question has 4 options out of which only one is correct.
                                            </li>
                                            <li>
                                                You have to finish the test in {formatDuration(examSet.duration_minutes).toLowerCase()}.
                                            </li>
                                            <li>
                                                You will be awarded {examSet.marks_per_question} marks for each correct answer and {examSet.negative_marking} marks will be deducted for each wrong answer.
                                            </li>
                                            <li>
                                                There is no negative marking for questions that you have not attempted.
                                            </li>
                                            <li>
                                                You can write this test only once. Make sure that you complete the test before you submit the test and/or close the browser.
                                            </li>
                                        </ol>
                                    </div>

                                    {/* Divider before Language Selection */}
                                    <div className="border-t-2 border-gray-200 my-4"></div>

                                    {/* Language Selection */}
                                    <div className="mt-4 text-left">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                                            Choose your default language:
                                        </label>
                                        <select
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        >
                                            <option value="">-- Select --</option>
                                            {languages.map((lang) => (
                                                <option key={lang} value={lang}>
                                                    {lang}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-red-600 mt-2">
                                            Please note all questions will appear in your default language. This language can be changed for a particular question later on.
                                        </p>
                                    </div>

                                    {/* Declaration */}
                                    <div className="mt-4 text-left">
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 text-left">Declaration:</h3>
                                        <label className="flex items-start gap-3 cursor-pointer group text-left">
                                            <input
                                                type="checkbox"
                                                checked={declarationChecked}
                                                onChange={(e) => setDeclarationChecked(e.target.checked)}
                                                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className="text-gray-700 text-sm leading-relaxed group-hover:text-gray-900">
                                                I have read all the instructions carefully and have understood them. I agree not to cheat or use unfair means in this examination. I understand that using unfair means of any sort for my own or someone else's advantage will lead to my immediate disqualification. The decision of AI PYQ Assistant will be final in these matters and cannot be appealed.
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Sidebar - User Profile - 20% width */}
                <div className="w-1/5 flex-shrink-0 px-6 py-6">
                    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 h-fit sticky top-6">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                U
                            </div>
                            <div className="text-base font-semibold text-gray-800">User</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Bar - Fixed at bottom of viewport, 80% width matching content card */}
            <div className="fixed bottom-0 left-0 bg-white border-t-2 border-gray-200 shadow-lg z-50 flex-shrink-0" style={{ width: '80%' }}>
                <div className="w-full px-6 py-4">
                    <div className="flex justify-between items-center">
                        {currentPage === "symbols" ? (
                            <>
                                <button
                                    onClick={() => navigate("/exam-mode")}
                                    className="px-6 py-2.5 text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors hover:underline"
                                >
                                    ← Go to Tests
                                </button>
                                <button
                                    onClick={() => setCurrentPage("instructions")}
                                    className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                                >
                                    Next
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setCurrentPage("symbols")}
                                    className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all duration-300"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={handleStartExam}
                                    disabled={starting || !selectedLanguage || !declarationChecked}
                                    className="px-8 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                    {starting ? "Starting..." : "I am ready to begin"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
