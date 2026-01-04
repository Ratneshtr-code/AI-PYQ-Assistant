// src/TopicWisePYQPage.jsx
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSearchAPI } from "./hooks/useSearchAPI";
import { useLanguage } from "./contexts/LanguageContext";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import ResultsList from "./components/ResultsList";
import Pagination from "./components/Pagination";

export default function TopicWisePYQPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const apiUrl = buildApiUrl("search");
    const filtersUrl = buildApiUrl("filters");
    const subjectsUrl = buildApiUrl("topic-wise/subjects");
    const topicsUrl = buildApiUrl("topic-wise/topics");

    // Initialize state from URL params if they exist (for direct navigation from roadmap)
    const [exam, setExam] = useState(() => {
        const examParam = searchParams.get('exam');
        return examParam ? decodeURIComponent(examParam) : "";
    });
    const [subject, setSubject] = useState(() => {
        const subjectParam = searchParams.get('subject');
        return subjectParam ? decodeURIComponent(subjectParam) : "";
    });
    const [topic, setTopic] = useState(() => {
        const topicParam = searchParams.get('topic');
        return topicParam ? decodeURIComponent(topicParam) : "";
    });
    const [examsList, setExamsList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [topicsList, setTopicsList] = useState([]);
    const [explanationWindowOpen, setExplanationWindowOpen] = useState(false);
    const [explanationWindowMinimized, setExplanationWindowMinimized] = useState(false);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const { language } = useLanguage(); // Get language from context

    // Check if coming from AI Roadmap
    const fromRoadmap = searchParams.get('from') === 'ai-roadmap';
    const roadmapExam = searchParams.get('exam');

    // Update state when URL params change (for browser back/forward navigation)
    useEffect(() => {
        const examParam = searchParams.get('exam');
        const subjectParam = searchParams.get('subject');
        const topicParam = searchParams.get('topic');
        
        if (examParam && decodeURIComponent(examParam) !== exam) {
            setExam(decodeURIComponent(examParam));
        }
        if (subjectParam && decodeURIComponent(subjectParam) !== subject) {
            setSubject(decodeURIComponent(subjectParam));
        }
        if (topicParam && decodeURIComponent(topicParam) !== topic) {
            setTopic(decodeURIComponent(topicParam));
        }
    }, [searchParams]);

    const {
        results,
        totalMatches,
        page,
        pageSize,
        loading,
        error,
        hasSearched,
        doSearch,
    } = useSearchAPI(apiUrl);

    // Fetch exams list
    useEffect(() => {
        const fetchExams = async () => {
            try {
                console.log("🔍 [Topic-wise PYQ] Fetching exams from:", filtersUrl);
                const res = await fetch(filtersUrl, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                console.log("📡 [Topic-wise PYQ] Response status:", res.status, res.statusText);
                
                if (!res.ok) {
                    const text = await res.text();
                    console.error("❌ [Topic-wise PYQ] Failed to fetch exams. Status:", res.status, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("❌ [Topic-wise PYQ] Response is not JSON. Content-Type:", contentType, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const data = await res.json();
                console.log("✅ [Topic-wise PYQ] Exams data received:", data);
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("❌ [Topic-wise PYQ] Error fetching exam filters:", err);
                setExamsList([]);
            }
        };
        fetchExams();
    }, [filtersUrl]);

    // Fetch subjects when exam is selected
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!exam) {
                setSubjectsList([]);
                // Only reset subject if it's not in URL params
                const subjectParam = searchParams.get('subject');
                if (!subjectParam) {
                    setSubject("");
                }
                setTopicsList([]);
                const topicParam = searchParams.get('topic');
                if (!topicParam) {
                    setTopic("");
                }
                return;
            }

            try {
                const res = await fetch(`${subjectsUrl}?exam=${encodeURIComponent(exam)}`);
                const data = await res.json();
                setSubjectsList(data.subjects || []);
                
                // Check if we have a subject from URL params - always respect URL params
                const subjectParam = searchParams.get('subject');
                if (subjectParam) {
                    const decodedSubject = decodeURIComponent(subjectParam);
                    // Set subject from URL (it might not be in the list yet, but that's okay)
                    // The search will work with the URL value even if dropdown doesn't show it
                    setSubject(decodedSubject);
                } else if (!subject) {
                    // No subject in URL and no subject set, reset it
                    setSubject("");
                    setTopicsList([]);
                    setTopic("");
                }
            } catch (err) {
                console.error("Failed to fetch subjects:", err);
                setSubjectsList([]);
            }
        };
        fetchSubjects();
    }, [exam, subjectsUrl, searchParams]);

    // Fetch topics when subject is selected
    useEffect(() => {
        const fetchTopics = async () => {
            if (!exam || !subject) {
                setTopicsList([]);
                // Only reset topic if it's not in URL params
                const topicParam = searchParams.get('topic');
                if (!topicParam) {
                    setTopic("");
                }
                return;
            }

            try {
                const res = await fetch(
                    `${topicsUrl}?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`
                );
                const data = await res.json();
                setTopicsList(data.topics || []);
                
                // Check if we have a topic from URL params - always respect URL params
                const topicParam = searchParams.get('topic');
                if (topicParam) {
                    const decodedTopic = decodeURIComponent(topicParam);
                    // Set topic from URL (it might not be in the list yet, but that's okay)
                    // The search will work with the URL value even if dropdown doesn't show it
                    setTopic(decodedTopic);
                } else if (!topic) {
                    // No topic in URL and no topic set, reset it
                    setTopic("");
                }
            } catch (err) {
                console.error("Failed to fetch topics:", err);
                setTopicsList([]);
            }
        };
        fetchTopics();
    }, [exam, subject, topicsUrl, searchParams]);

    // Debounce timer ref for auto-search
    const autoSearchTimerRef = useRef(null);
    const lastSearchParamsRef = useRef({ topic: "", exam: "", subject: "", language: "en" });
    const hasInitializedRef = useRef(false);

    // Search when topic or language is selected (with debouncing to prevent duplicate requests)
    useEffect(() => {
        // Clear any pending auto-search
        if (autoSearchTimerRef.current) {
            clearTimeout(autoSearchTimerRef.current);
        }

        // Check if params actually changed
        const currentParams = { 
            topic: topic || "", 
            exam: exam || "", 
            subject: subject || "", 
            language: language || "en" 
        };
        const paramsChanged = 
            currentParams.topic !== lastSearchParamsRef.current.topic ||
            currentParams.exam !== lastSearchParamsRef.current.exam ||
            currentParams.subject !== lastSearchParamsRef.current.subject ||
            currentParams.language !== lastSearchParamsRef.current.language;

        // On initial load with URL params, we need to trigger search even if params haven't "changed"
        // (because ref starts with empty values, but we want to search with URL values)
        const isInitialLoadWithParams = !hasInitializedRef.current && topic && exam && subject;

        if ((!paramsChanged && !isInitialLoadWithParams) || !topic || !exam || !subject) {
            // No change (and not initial load) or missing required params, don't search
            if (isInitialLoadWithParams) {
                hasInitializedRef.current = true;
            }
            return;
        }

        // Mark as initialized
        hasInitializedRef.current = true;

        // Update last params
        lastSearchParamsRef.current = currentParams;

        // Only auto-search if all required params exist
        if (topic && exam && subject) {
            // For initial load with URL params, trigger search immediately (no debounce)
            // For subsequent changes, use debounce to prevent duplicate requests
            if (isInitialLoadWithParams) {
                // Immediate search for initial load from roadmap
                console.log("🚀 Initial load with URL params - triggering immediate search", { exam, subject, topic });
                handleSearch();
            } else if (!loading) {
                // Debounce for subsequent changes: Wait 300ms before triggering search
                autoSearchTimerRef.current = setTimeout(() => {
                    // Double-check we're not already loading
                    if (!loading && topic && exam && subject) {
                        handleSearch();
                    }
                }, 300);
            }
        }

        // Cleanup on unmount or dependency change
        return () => {
            if (autoSearchTimerRef.current) {
                clearTimeout(autoSearchTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topic, exam, subject, language, loading]);

    const handleSearch = async () => {
        if (!exam || !subject || !topic) {
            console.warn("⚠️ Cannot search - missing required params:", { exam, subject, topic });
            return;
        }
        
        console.log("🔍 Triggering search with params:", { exam, subject, topic, language });
        // Use topic as the search query - the backend will filter by topic_tag
        await doSearch(topic, 1, { exam, subject, topic, language });
    };

    const handlePageChange = (p) => {
        if (topic && exam && subject) {
            doSearch(topic, p, { exam, subject, language });
        }
    };

    const handleExplanationWindowChange = (isOpen, isMinimized) => {
        setExplanationWindowOpen(isOpen);
        setExplanationWindowMinimized(isMinimized);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* 🧭 Sidebar */}
            <Sidebar 
                exam={exam} 
                setExam={setExam} 
                examsList={examsList} 
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* 📚 Main Content Area */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "md:ml-16" : "md:ml-64"
                }`}
            >
                {/* Filter Bar - Now part of page content, not sticky */}
                <div className={`w-full relative z-10 ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                    <FilterBar
                        exam={exam}
                        setExam={setExam}
                        examsList={examsList}
                        subject={subject}
                        setSubject={setSubject}
                        subjectsList={subjectsList}
                        topic={topic}
                        setTopic={setTopic}
                        topicsList={topicsList}
                        showSubject={true}
                        showExam={true}
                        showTopic={true}
                        showYearRange={false}
                    />
                </div>

                {/* Content Area */}
                <div className="w-full max-w-7xl mx-auto px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 relative z-0">
                    {/* Back Button - Show when coming from AI Roadmap */}
                    {fromRoadmap && (
                        <div className={`mb-4 ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                            <button
                                onClick={() => navigate(`/ai-roadmap${roadmapExam ? `?exam=${encodeURIComponent(roadmapExam)}` : ''}`)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to AI Roadmap
                            </button>
                        </div>
                    )}
                    {/* Header - Centered and shifts with explanation window */}
                    <div className={`flex items-center justify-center mb-3 ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Topic-wise PYQ
                        </h1>
                    </div>

                    {/* Content Container */}
                    <div className="max-w-4xl w-full mx-auto space-y-6 results-parent-container">

                        {/* Conditional Rendering */}
                        {!topic || !exam || !subject ? (
                            <div className="text-center py-4">
                                <p className="text-gray-500 text-lg">
                                    Please select Exam, Subject, and Topic to view questions.
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="text-gray-500 mt-4">Loading questions...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-600">Error: {error}</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No questions found for the selected filters.</p>
                            </div>
                        ) : (
                            <>
                                <ResultsList
                                    results={results}
                                    onExplanationWindowChange={handleExplanationWindowChange}
                                />
                                <div
                                    className={
                                        explanationWindowOpen && !explanationWindowMinimized
                                            ? "results-container-shifted"
                                            : ""
                                    }
                                    style={
                                        explanationWindowOpen && !explanationWindowMinimized
                                            ? { maxWidth: "48rem", width: "100%", marginRight: "440px", marginLeft: "auto" }
                                            : {}
                                    }
                                >
                                    <Pagination
                                        page={page}
                                        totalMatches={totalMatches}
                                        pageSize={pageSize}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

