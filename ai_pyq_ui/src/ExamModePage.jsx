// src/ExamModePage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./components/Sidebar";

const API_BASE_URL = "";

export default function ExamModePage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [examSets, setExamSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Test type selection - restore from URL params or localStorage
    // Options: "mock", "exam", "subject", "my-attempts"
    const [testType, setTestType] = useState(() => {
        const urlTestType = new URLSearchParams(window.location.search).get("testType");
        const stored = localStorage.getItem("examMode_testType");
        return urlTestType || stored || "mock";
    });
    
    // Filters - restore from URL params or localStorage
    const [exam, setExam] = useState(() => {
        const urlExam = new URLSearchParams(window.location.search).get("exam");
        const stored = localStorage.getItem("examMode_exam");
        return urlExam || stored || "";
    });
    const [subject, setSubject] = useState(() => {
        const urlSubject = new URLSearchParams(window.location.search).get("subject");
        const stored = localStorage.getItem("examMode_subject");
        return urlSubject || stored || "";
    });
    const [examsList, setExamsList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [userAttempts, setUserAttempts] = useState({}); // Map of examSetId -> { attemptId, status, completed_at, score, total_marks }
    const userAttemptsRef = useRef({}); // Ref to track userAttempts without causing re-renders
    
    // Test type filter for "My Tests" section: "all", "mock_test", "subject_test", "pyp"
    const [myTestsFilterType, setMyTestsFilterType] = useState(() => {
        const stored = localStorage.getItem("examMode_myTestsFilterType");
        return stored || "all";
    });

    // Sync state with URL params when component mounts or URL changes
    useEffect(() => {
        const urlTestType = searchParams.get("testType");
        const urlExam = searchParams.get("exam");
        const urlSubject = searchParams.get("subject");
        
        if (urlTestType && urlTestType !== testType) {
            setTestType(urlTestType);
            localStorage.setItem("examMode_testType", urlTestType);
        }
        if (urlExam !== null && urlExam !== exam) {
            setExam(urlExam);
            localStorage.setItem("examMode_exam", urlExam);
        }
        if (urlSubject !== null && urlSubject !== subject) {
            setSubject(urlSubject);
            localStorage.setItem("examMode_subject", urlSubject);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]); // Only run when URL params change

    // Fetch exam sets - re-run when userAttempts changes (important for "My Tests" tab)
    useEffect(() => {
        const fetchExamSets = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                
                // Apply filters based on test type
                if (testType === "mock") {
                    // Mock Tests: can filter by exam, and optionally by subject
                    if (exam) params.append("exam", exam);
                    if (subject) params.append("subject", subject);
                } else if (testType === "exam") {
                    // PYQ Tests: filter by exam only
                    if (exam) params.append("exam", exam);
                } else if (testType === "subject") {
                    // Subject Tests: filter by exam and subject
                    if (exam) params.append("exam", exam);
                    if (subject) params.append("subject", subject);
                }
                // "My Tests" tab doesn't apply filters - shows all completed tests
                
                const url = `${API_BASE_URL}/exam/sets?${params.toString()}`;
                const response = await fetch(url, {
                    credentials: "include"
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch exam sets");
                }
                
                const data = await response.json();
                // Filter by exam type
                let filtered = data.filter(set => {
                    if (testType === "mock") {
                        return set.exam_type === "mock_test";
                    } else if (testType === "exam") {
                        // PYQ Tests: Only show exam_type === "pyp" and no subject (full papers)
                        return set.exam_type === "pyp" && !set.subject;
                    } else if (testType === "subject") {
                        return set.subject && set.exam_type === "subject_test";
                    } else if (testType === "my-attempts") {
                        // For "My Tests", include all exam sets initially (no exam/subject filtering)
                        return true;
                    }
                    return false;
                });
                
                // If "My Tests" tab, filter to show only completed exams
                if (testType === "my-attempts") {
                    filtered = filtered.filter(set => {
                        const examSetId = String(set.id);
                        const attempt = userAttemptsRef.current[examSetId] || userAttemptsRef.current[set.id];
                        const isCompleted = attempt && (attempt.status === 'completed' || attempt.status === 'submitted');
                        
                        if (!isCompleted) return false;
                        
                        // Apply test type filter
                        if (myTestsFilterType === "all") {
                            return true;
                        } else if (myTestsFilterType === "mock_test") {
                            return set.exam_type === "mock_test";
                        } else if (myTestsFilterType === "subject_test") {
                            return set.exam_type === "subject_test";
                        } else if (myTestsFilterType === "pyp") {
                            return set.exam_type === "pyp";
                        }
                        return true;
                    });
                }
                
                // Check if exam sets response includes attempt information BEFORE setting examSets
                // This prevents double rendering
                let attemptsFromSets = {};
                if (filtered.length > 0 && filtered[0].latest_attempt) {
                    filtered.forEach(set => {
                        if (set.latest_attempt) {
                            attemptsFromSets[String(set.id)] = {
                                attempt_id: set.latest_attempt.id || set.latest_attempt.attempt_id,
                                status: set.latest_attempt.status,
                                completed_at: set.latest_attempt.completed_at,
                                created_at: set.latest_attempt.created_at,
                                score: set.latest_attempt.score || set.latest_attempt.total_score || set.latest_attempt.marks_obtained || 0,
                                total_marks: set.latest_attempt.total_marks || set.latest_attempt.totalMarks || null
                            };
                        }
                    });
                }
                
                // Batch state updates to prevent double render
                if (Object.keys(attemptsFromSets).length > 0) {
                    setUserAttempts(prev => {
                        const updated = { ...prev, ...attemptsFromSets };
                        userAttemptsRef.current = updated;
                        return updated;
                    });
                }
                setExamSets(filtered);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchExamSets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam, subject, testType, myTestsFilterType]); // Removed userAttempts - using ref instead to prevent double render

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

    // Fetch user exam attempts
    useEffect(() => {
        const fetchUserAttempts = async () => {
            try {
                // DATABASE IS THE SOURCE OF TRUTH - Always fetch from API first
                let response = await fetch(`${API_BASE_URL}/exam/user/attempts`, {
                    credentials: "include"
                });
                
                // If first endpoint fails, try alternative
                if (!response.ok) {
                    response = await fetch(`${API_BASE_URL}/exam/attempts`, {
                        credentials: "include"
                    });
                }
                
                if (!response.ok) {
                    console.warn("Failed to fetch user attempts from API");
                    // On API failure, clear localStorage to prevent showing wrong user's data
                    localStorage.removeItem('exam_attempts');
                    userAttemptsRef.current = {};
                    setUserAttempts({});
                    return;
                }
                
                const data = await response.json();
                console.log("User attempts data from API (DATABASE):", data); // Debug log
                
                // Transform data into a map: exam_set_id -> { attempt_id, status, completed_at }
                const attemptsMap = {};
                if (Array.isArray(data)) {
                    data.forEach(attempt => {
                        // Handle both string and number IDs
                        const examSetId = String(attempt.exam_set_id || attempt.examSetId || attempt.exam_set?.id);
                        const attemptId = attempt.id || attempt.attempt_id;
                        const status = attempt.status;
                        const createdAt = attempt.created_at || attempt.createdAt;
                        const completedAt = attempt.completed_at || attempt.completedAt;
                        
                        if (examSetId && attemptId) {
                            // Keep only the latest attempt for each exam set
                            if (!attemptsMap[examSetId] || 
                                (createdAt && new Date(createdAt) > new Date(attemptsMap[examSetId].created_at || 0))) {
                                attemptsMap[examSetId] = {
                                    attempt_id: attemptId,
                                    status: status,
                                    completed_at: completedAt,
                                    created_at: createdAt,
                                    score: attempt.score || attempt.total_score || attempt.marks_obtained || 0,
                                    total_marks: attempt.total_marks || attempt.totalMarks || null
                                };
                            }
                        }
                    });
                } else if (typeof data === 'object' && data !== null) {
                    // If data is already a map/object
                    Object.keys(data).forEach(examSetId => {
                        const attempt = data[examSetId];
                        if (attempt && (attempt.attempt_id || attempt.id)) {
                            attemptsMap[String(examSetId)] = {
                                attempt_id: attempt.attempt_id || attempt.id,
                                status: attempt.status,
                                completed_at: attempt.completed_at || attempt.completedAt,
                                created_at: attempt.created_at,
                                score: attempt.score || attempt.total_score || attempt.marks_obtained || 0,
                                total_marks: attempt.total_marks || attempt.totalMarks || null
                            };
                        }
                    });
                }
                
                console.log("Processed attempts map from API (DATABASE):", attemptsMap); // Debug log
                
                // Use ONLY API data (database is source of truth)
                // Only merge localStorage if it has very recent data (within last 2 minutes) from current session
                const storedAttempts = JSON.parse(localStorage.getItem('exam_attempts') || '{}');
                const finalAttempts = { ...attemptsMap };
                
                // Only keep localStorage data if it's very recent (just submitted in current session)
                // This prevents cross-user contamination
                Object.keys(storedAttempts).forEach(examSetId => {
                    if (!attemptsMap[examSetId]) {
                        const storedAttempt = storedAttempts[examSetId];
                        const storedDate = storedAttempt.completed_at || storedAttempt.created_at;
                        // Only keep if it's from the last 2 minutes (very recent, likely just submitted)
                        if (storedDate && new Date(storedDate) > new Date(Date.now() - 2 * 60 * 1000)) {
                            finalAttempts[examSetId] = storedAttempt;
                        }
                    }
                });
                
                // Update state with database data
                userAttemptsRef.current = finalAttempts;
                setUserAttempts(finalAttempts);
                // Update localStorage with database data (for performance, but database is source of truth)
                localStorage.setItem('exam_attempts', JSON.stringify(finalAttempts));
            } catch (err) {
                console.error("Error fetching user attempts:", err);
                // Clear localStorage on error to prevent showing stale/wrong user's data
                localStorage.removeItem('exam_attempts');
                userAttemptsRef.current = {};
                setUserAttempts({});
            }
        };
        
        fetchUserAttempts();
        
        // Refetch attempts when page becomes visible (user returns to tab)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchUserAttempts();
            }
        };
        
        // Clear attempts when user logs out
        const handleUserLogout = () => {
            userAttemptsRef.current = {};
            setUserAttempts({});
            localStorage.removeItem('exam_attempts');
        };
        
        // Refetch attempts when user logs in (clear localStorage first to prevent cross-user contamination)
        const handleUserLogin = () => {
            // Clear localStorage first to ensure we don't show previous user's data
            localStorage.removeItem('exam_attempts');
            userAttemptsRef.current = {};
            setUserAttempts({});
            // Then fetch fresh data from database
            fetchUserAttempts();
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('userLoggedOut', handleUserLogout);
        window.addEventListener('userLoggedIn', handleUserLogin);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('userLoggedOut', handleUserLogout);
            window.removeEventListener('userLoggedIn', handleUserLogin);
        };
    }, []); // Refetch when component mounts or when returning to page
    
    // Also refetch attempts when exam sets are loaded (in case they include attempt info)
    useEffect(() => {
        if (examSets.length > 0) {
            const fetchUserAttempts = async () => {
                try {
                    let response = await fetch(`${API_BASE_URL}/exam/user/attempts`, {
                        credentials: "include"
                    });
                    
                    if (!response.ok) {
                        response = await fetch(`${API_BASE_URL}/exam/attempts`, {
                            credentials: "include"
                        });
                    }
                    
                    if (response.ok) {
                        const data = await response.json();
                        const attemptsMap = {};
                        if (Array.isArray(data)) {
                            data.forEach(attempt => {
                                const examSetId = String(attempt.exam_set_id || attempt.examSetId || attempt.exam_set?.id);
                                const attemptId = attempt.id || attempt.attempt_id;
                                const status = attempt.status;
                                const createdAt = attempt.created_at || attempt.createdAt;
                                
                                if (examSetId && attemptId) {
                                    if (!attemptsMap[examSetId] || 
                                        (createdAt && new Date(createdAt) > new Date(attemptsMap[examSetId].created_at || 0))) {
                                        attemptsMap[examSetId] = {
                                            attempt_id: attemptId,
                                            status: status,
                                            completed_at: attempt.completed_at || attempt.completedAt,
                                            created_at: createdAt,
                                            score: attempt.score || attempt.total_score || attempt.marks_obtained || 0,
                                            total_marks: attempt.total_marks || attempt.totalMarks || null
                                        };
                                    }
                                }
                            });
                        } else if (typeof data === 'object' && data !== null) {
                            Object.keys(data).forEach(examSetId => {
                                const attempt = data[examSetId];
                                if (attempt && (attempt.attempt_id || attempt.id)) {
                            attemptsMap[String(examSetId)] = {
                                attempt_id: attempt.attempt_id || attempt.id,
                                status: attempt.status,
                                completed_at: attempt.completed_at,
                                created_at: attempt.created_at,
                                score: attempt.score || attempt.total_score || attempt.marks_obtained || 0,
                                total_marks: attempt.total_marks || attempt.totalMarks || null
                            };
                                }
                            });
                        }
                        setUserAttempts(prev => {
                            const updated = { ...prev, ...attemptsMap };
                            userAttemptsRef.current = updated;
                            return updated;
                        });
                    }
                } catch (err) {
                    console.error("Error refetching user attempts:", err);
                }
            };
            
            fetchUserAttempts();
        }
    }, [examSets.length]); // Refetch when exam sets change

    // Safety: Keep ref in sync with state (in case any setUserAttempts is missed)
    useEffect(() => {
        userAttemptsRef.current = userAttempts;
    }, [userAttempts]);

    // Save filter state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("examMode_testType", testType);
        localStorage.setItem("examMode_exam", exam);
        localStorage.setItem("examMode_subject", subject);
        
        // Update URL params
        const params = new URLSearchParams();
        if (testType) params.set("testType", testType);
        if (exam) params.set("exam", exam);
        if (subject) params.set("subject", subject);
        setSearchParams(params, { replace: true });
    }, [testType, exam, subject, setSearchParams]);

    const handleStartExam = (examSetId) => {
        // Save current filter state before navigating
        localStorage.setItem("examMode_testType", testType);
        localStorage.setItem("examMode_exam", exam);
        localStorage.setItem("examMode_subject", subject);
        navigate(`/exam-mode/instructions/${examSetId}`);
    };

    const handleViewResults = (attemptId) => {
        navigate(`/exam/${attemptId}/results`);
    };

    const handleContinueExam = (attemptId) => {
        navigate(`/exam/${attemptId}`);
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
                <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-4">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Test Series
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Practice with full-length mock tests and previous year papers
                        </p>
                    </div>

                    {/* Test Type Selection */}
                    <div className="mb-6">
                        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setTestType("mock");
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        testType === "mock"
                                            ? "border-blue-500 bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                                            testType === "mock" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                        }`}>
                                            🎯
                                        </div>
                                        <div className="text-left">
                                            <h3 className={`text-lg font-bold mb-1 ${
                                                testType === "mock" ? "text-blue-700" : "text-gray-900"
                                            }`}>
                                                Mock Tests
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Random 20 questions from exam/subject
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setTestType("exam");
                                        setSubject("");
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        testType === "exam"
                                            ? "border-blue-500 bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                                            testType === "exam" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                        }`}>
                                            📝
                                        </div>
                                        <div className="text-left">
                                            <h3 className={`text-lg font-bold mb-1 ${
                                                testType === "exam" ? "text-blue-700" : "text-gray-900"
                                            }`}>
                                                PYQ Test
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Full-length previous year papers
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setTestType("subject")}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        testType === "subject"
                                            ? "border-blue-500 bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
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

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setTestType("my-attempts");
                                        setExam(""); // Clear exam filter for "My Tests" tab
                                        setSubject(""); // Clear subject filter for "My Tests" tab
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        testType === "my-attempts"
                                            ? "border-blue-500 bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                                            testType === "my-attempts" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
                                        }`}>
                                            ✅
                                        </div>
                                        <div className="text-left">
                                            <h3 className={`text-lg font-bold mb-1 ${
                                                testType === "my-attempts" ? "text-blue-700" : "text-gray-900"
                                            }`}>
                                                My Tests
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                View all your completed tests
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Filters for My Tests - Test Type Filter */}
                    {testType === "my-attempts" && (
                    <div className="mb-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Filter by Test Type
                        </label>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => {
                                    setMyTestsFilterType("all");
                                    localStorage.setItem("examMode_myTestsFilterType", "all");
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                    myTestsFilterType === "all"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                All Tests
                            </button>
                            <button
                                onClick={() => {
                                    setMyTestsFilterType("mock_test");
                                    localStorage.setItem("examMode_myTestsFilterType", "mock_test");
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                    myTestsFilterType === "mock_test"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Mock Tests
                            </button>
                            <button
                                onClick={() => {
                                    setMyTestsFilterType("subject_test");
                                    localStorage.setItem("examMode_myTestsFilterType", "subject_test");
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                    myTestsFilterType === "subject_test"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Subject Tests
                            </button>
                            <button
                                onClick={() => {
                                    setMyTestsFilterType("pyp");
                                    localStorage.setItem("examMode_myTestsFilterType", "pyp");
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                    myTestsFilterType === "pyp"
                                        ? "bg-blue-500 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                Previous Year Papers
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Filters - Show for Mock Tests, PYQ Tests, and Subject Tests */}
                    {testType !== "my-attempts" && (
                    <div className="mb-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select Exam
                                </label>
                                <select
                                    value={exam}
                                    onChange={(e) => {
                                        setExam(e.target.value);
                                        if (testType !== "mock") {
                                            setSubject("");
                                        }
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

                            {(testType === "subject" || testType === "mock") && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Select Subject {testType === "mock" && "(Optional)"}
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
                    )}

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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {examSets.map((examSet, index) => {
                                        // Try both string and number ID matching
                                        const examSetId = String(examSet.id);
                                        const attempt = userAttempts[examSetId] || userAttempts[examSet.id];
                                        const isAttempted = !!attempt;
                                        const isCompleted = attempt?.status === 'completed' || attempt?.status === 'submitted';
                                        const isInProgress = attempt?.status === 'in_progress';
                                        
                                        // Debug log to help troubleshoot
                                        if (isAttempted) {
                                            console.log(`Exam ${examSetId} has attempt:`, attempt);
                                        }
                                        
                                        return (
                                        <div
                                            key={`${testType}-${examSet.id}`}
                                            className={`bg-white rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
                                                isAttempted ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                                            }`}
                                        >
                                            <div className="p-5">
                                                {/* Exam Type Badge and Attempt Indicator */}
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    {examSet.exam_type && (
                                                        <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {examSet.exam_type.toUpperCase()}
                                                        </span>
                                                    )}
                                                    {isAttempted && (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            {isCompleted ? 'Completed' : 'In Progress'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                                    {examSet.name}
                                                </h3>

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
                                                        <span>
                                                            {isAttempted && attempt?.score !== undefined && attempt?.score !== null
                                                                ? `${parseFloat(attempt.score).toFixed(1)}` 
                                                                : '0'
                                                            } / {attempt?.total_marks || (examSet.total_questions * examSet.marks_per_question)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="space-y-2">
                                                    {isCompleted ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleViewResults(attempt.attempt_id)}
                                                                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                            >
                                                                View Results
                                                            </button>
                                                            <button
                                                                onClick={() => handleStartExam(examSet.id)}
                                                                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 text-sm"
                                                            >
                                                                Reattempt Test
                                                            </button>
                                                        </>
                                                    ) : isInProgress ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleContinueExam(attempt.attempt_id)}
                                                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                            >
                                                                Continue Exam
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewResults(attempt.attempt_id)}
                                                                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 text-sm"
                                                            >
                                                                View Progress
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStartExam(examSet.id)}
                                                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                                                        >
                                                            Start Exam
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

