// src/TopicWisePYQPage.jsx
import { useState, useEffect } from "react";
import { useSearchAPI } from "./hooks/useSearchAPI";
import Sidebar from "./components/Sidebar";
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
            <Sidebar exam={exam} setExam={setExam} examsList={examsList} onOpenSecondarySidebar={() => {}} />

            {/* 📚 Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-start p-8 pl-64 transition-all duration-300 relative">
                {/* Header with Heading Centered */}
                <div className="flex items-center justify-between gap-4 mb-6 relative w-full">
                    {/* Spacer for balance */}
                    <div className="w-[156px]"></div>

                    {/* Heading - Centered */}
                    <h1 className="text-3xl font-bold absolute left-1/2 transform -translate-x-1/2">
                        Topic-wise PYQ
                    </h1>

                    {/* Spacer for balance */}
                    <div className="w-[156px]"></div>
                </div>

                {/* Content Container */}
                <div className="max-w-4xl w-full mx-auto space-y-6 results-parent-container">
                    {/* Filters */}
                    <div
                        className={`flex flex-col sm:flex-row gap-4 justify-center items-end p-6 bg-white rounded-xl shadow-sm border border-gray-200 ${
                            explanationWindowOpen && !explanationWindowMinimized ? "results-container-shifted" : ""
                        }`}
                        style={
                            explanationWindowOpen && !explanationWindowMinimized
                                ? { maxWidth: "48rem", width: "100%", marginRight: "440px", marginLeft: "auto" }
                                : {}
                        }
                    >
                        {/* Exam Filter */}
                        <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                            <label className="text-sm font-medium text-gray-700">Exam</label>
                            <select
                                value={exam}
                                onChange={(e) => setExam(e.target.value)}
                                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                            >
                                <option value="">Select Exam</option>
                                {examsList.map((ex, idx) => (
                                    <option key={idx} value={ex}>
                                        {ex}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Filter */}
                        <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                            <label className="text-sm font-medium text-gray-700">Subject</label>
                            <select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={!exam || subjectsList.length === 0}
                                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                                <option value="">Select Subject</option>
                                {subjectsList.map((subj, idx) => (
                                    <option key={idx} value={subj}>
                                        {subj}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Topic Filter */}
                        <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                            <label className="text-sm font-medium text-gray-700">Topic</label>
                            <select
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                disabled={!subject || !exam || topicsList.length === 0}
                                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                                <option value="">Select Topic</option>
                                {topicsList.map((top, idx) => (
                                    <option key={idx} value={top}>
                                        {top}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Conditional Rendering */}
                    {!topic || !exam || !subject ? (
                        <div className="text-center py-12">
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
            </main>
        </div>
    );
}

