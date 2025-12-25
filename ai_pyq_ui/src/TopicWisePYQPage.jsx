// src/TopicWisePYQPage.jsx
import { useState, useEffect } from "react";
import { useSearchAPI } from "./hooks/useSearchAPI";
import Sidebar from "./components/Sidebar";
import FilterBar from "./components/FilterBar";
import ResultsList from "./components/ResultsList";
import Pagination from "./components/Pagination";

export default function TopicWisePYQPage() {
    const apiUrl = "http://127.0.0.1:8000/search";
    const filtersUrl = "http://127.0.0.1:8000/filters";
    const subjectsUrl = "http://127.0.0.1:8000/topic-wise/subjects";
    const topicsUrl = "http://127.0.0.1:8000/topic-wise/topics";

    const [exam, setExam] = useState("");
    const [subject, setSubject] = useState("");
    const [topic, setTopic] = useState("");
    const [examsList, setExamsList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [topicsList, setTopicsList] = useState([]);
    const [explanationWindowOpen, setExplanationWindowOpen] = useState(false);
    const [explanationWindowMinimized, setExplanationWindowMinimized] = useState(false);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

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
                const res = await fetch(filtersUrl);
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exam filters:", err);
            }
        };
        fetchExams();
    }, [filtersUrl]);

    // Fetch subjects when exam is selected
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!exam) {
                setSubjectsList([]);
                setSubject("");
                setTopicsList([]);
                setTopic("");
                return;
            }

            try {
                const res = await fetch(`${subjectsUrl}?exam=${encodeURIComponent(exam)}`);
                const data = await res.json();
                setSubjectsList(data.subjects || []);
                setSubject(""); // Reset subject when exam changes
                setTopicsList([]);
                setTopic(""); // Reset topic when exam changes
            } catch (err) {
                console.error("Failed to fetch subjects:", err);
                setSubjectsList([]);
            }
        };
        fetchSubjects();
    }, [exam, subjectsUrl]);

    // Fetch topics when subject is selected
    useEffect(() => {
        const fetchTopics = async () => {
            if (!exam || !subject) {
                setTopicsList([]);
                setTopic("");
                return;
            }

            try {
                const res = await fetch(
                    `${topicsUrl}?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`
                );
                const data = await res.json();
                setTopicsList(data.topics || []);
                setTopic(""); // Reset topic when subject changes
            } catch (err) {
                console.error("Failed to fetch topics:", err);
                setTopicsList([]);
            }
        };
        fetchTopics();
    }, [exam, subject, topicsUrl]);

    // Search when topic is selected
    useEffect(() => {
        if (topic && exam && subject) {
            handleSearch();
        }
    }, [topic, exam, subject]); // Trigger when any filter changes

    const handleSearch = async () => {
        if (!exam || !subject || !topic) return;
        
        // Use topic as the search query - the backend will filter by topic_tag
        await doSearch(topic, 1, { exam, subject, topic });
    };

    const handlePageChange = (p) => {
        if (topic && exam && subject) {
            doSearch(topic, p, { exam, subject });
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
                    primarySidebarCollapsed ? "ml-16" : "ml-64"
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
                <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4 relative z-0">
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
                                    hideExploreTopicGraph={true}
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

