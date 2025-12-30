// src/ExamModePage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";

const API_BASE_URL = "";

export default function ExamModePage() {
    const navigate = useNavigate();
    const [examSets, setExamSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Test type selection
    const [testType, setTestType] = useState("exam"); // "exam" or "subject"
    
    // Filters
    const [exam, setExam] = useState("");
    const [subject, setSubject] = useState("");
    const [examsList, setExamsList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

    // Fetch exam sets
    useEffect(() => {
        const fetchExamSets = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (exam) params.append("exam", exam);
                if (testType === "subject" && subject) {
                    params.append("subject", subject);
                }
                
                const url = `${API_BASE_URL}/exam/sets?${params.toString()}`;
                const response = await fetch(url, {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch exam sets");
                }
                
                const data = await response.json();
                // Filter by exam type
                const filtered = data.filter(set => {
                    if (testType === "exam") {
                        return !set.subject || set.exam_type === "pyp";
                    } else {
                        return set.subject && set.exam_type === "subject_test";
                    }
                });
                setExamSets(filtered);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchExamSets();
    }, [exam, subject, testType]);

    // Fetch exams list
    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/filters`);
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();
    }, []);

    // Fetch subjects when exam changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!exam) {
                setSubjectsList([]);
                setSubject("");
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/topic-wise/subjects?exam=${encodeURIComponent(exam)}`);
                const data = await res.json();
                setSubjectsList(data.subjects || []);
            } catch (err) {
                console.error("Error fetching subjects:", err);
                setSubjectsList([]);
            }
        };
        fetchSubjects();
    }, [exam]);

    const handleStartExam = (examSetId) => {
        navigate(`/exam-mode/instructions/${examSetId}`);
    };

    const formatDuration = (minutes) => {
        if (minutes < 60) {
            return `${minutes} Mins`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} Hr ${mins} Mins` : `${hours} Hr`;
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Sidebar */}
            <Sidebar 
                exam={exam} 
                setExam={setExam} 
                examsList={examsList}
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "ml-16" : "ml-64"
                }`}
            >
                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Exam Mode
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Practice with full-length mock tests and previous year papers
                        </p>
                    </div>

                    {/* Test Type Selection */}
                    <div className="mb-8">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Test Type</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setTestType("exam");
                                        setSubject("");
                                    }}
                                    className={`p-6 rounded-xl border-2 transition-all ${
                                        testType === "exam"
                                            ? "border-blue-500 bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                                            testType === "exam" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                        }`}>
                                            📝
                                        </div>
                                        <div className="text-left">
                                            <h3 className={`text-lg font-bold mb-1 ${
                                                testType === "exam" ? "text-blue-700" : "text-gray-900"
                                            }`}>
                                                Exam Test
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Full-length previous year papers and mock tests
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setTestType("subject")}
                                    className={`p-6 rounded-xl border-2 transition-all ${
                                        testType === "subject"
                                            ? "border-blue-500 bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-3xl ${
                                            testType === "subject" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                        }`}>
                                            📚
                                        </div>
                                        <div className="text-left">
                                            <h3 className={`text-lg font-bold mb-1 ${
                                                testType === "subject" ? "text-blue-700" : "text-gray-900"
                                            }`}>
                                                Subject-wise Test
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Practice tests focused on specific subjects
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select Exam
                                </label>
                                <select
                                    value={exam}
                                    onChange={(e) => {
                                        setExam(e.target.value);
                                        setSubject("");
                                    }}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Exams</option>
                                    {examsList.map((examName) => (
                                        <option key={examName} value={examName}>
                                            {examName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {testType === "subject" && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Select Subject
                                    </label>
                                    <select
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        disabled={!exam}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">All Subjects</option>
                                        {subjectsList.map((subjectName) => (
                                            <option key={subjectName} value={subjectName}>
                                                {subjectName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-gray-500 mt-4">Loading exam sets...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Exam Sets Grid */}
                    {!loading && !error && (
                        <>
                            {examSets.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 text-lg">
                                        No exam sets found. Try adjusting your filters.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {examSets.map((examSet, index) => (
                                        <motion.div
                                            key={examSet.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.1 }}
                                            className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                                        >
                                            <div className="p-6">
                                                {/* Exam Type Badge */}
                                                {examSet.exam_type && (
                                                    <div className="mb-3">
                                                        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {examSet.exam_type.toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Title */}
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                    {examSet.name}
                                                </h3>

                                                {/* Description */}
                                                {examSet.description && (
                                                    <p className="text-sm text-gray-600 mb-4">
                                                        {examSet.description}
                                                    </p>
                                                )}

                                                {/* Exam Details */}
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex items-center text-sm text-gray-700">
                                                        <span className="font-semibold w-32">Questions:</span>
                                                        <span>{examSet.total_questions}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-700">
                                                        <span className="font-semibold w-32">Duration:</span>
                                                        <span>{formatDuration(examSet.duration_minutes)}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-700">
                                                        <span className="font-semibold w-32">Marks:</span>
                                                        <span>+{examSet.marks_per_question} / -{examSet.negative_marking}</span>
                                                    </div>
                                                    {examSet.exam_name && (
                                                        <div className="flex items-center text-sm text-gray-700">
                                                            <span className="font-semibold w-32">Exam:</span>
                                                            <span>{examSet.exam_name}</span>
                                                        </div>
                                                    )}
                                                    {examSet.subject && (
                                                        <div className="flex items-center text-sm text-gray-700">
                                                            <span className="font-semibold w-32">Subject:</span>
                                                            <span>{examSet.subject}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Start Button */}
                                                <button
                                                    onClick={() => handleStartExam(examSet.id)}
                                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    Start Exam
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

