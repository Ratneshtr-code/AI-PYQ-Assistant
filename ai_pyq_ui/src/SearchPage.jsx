// src/SearchPage.jsx
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSearchAPI } from "./hooks/useSearchAPI";
import Sidebar from "./components/Sidebar";
import ResultsList from "./components/ResultsList";
import Pagination from "./components/Pagination";
import ResultsChart from "./components/ResultsChart";

export default function SearchPage() {
    const apiUrl = "http://127.0.0.1:8000/search";
    const filtersUrl = "http://127.0.0.1:8000/filters";

    const [query, setQuery] = useState("");
    const [exam, setExam] = useState("");
    const [examsList, setExamsList] = useState([]);
    const [language, setLanguage] = useState("english");
    const [allResults, setAllResults] = useState([]);
    const [explanationWindowOpen, setExplanationWindowOpen] = useState(false);
    const [explanationWindowMinimized, setExplanationWindowMinimized] = useState(false);
    const location = useLocation();

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
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const initialQuery = params.get("query");
        if (initialQuery) {
            setQuery(initialQuery);
            doSearch(initialQuery, 1, { exam: "" });
        }
    }, [location.search]);

    // Auto-search when exam changes if query exists
    useEffect(() => {
        if (query.trim() && hasSearched) {
            handleSearch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        await doSearch(query, 1, { exam });

        if (exam === "") {
            const allFetched = [];
            let currentPage = 1;
            let morePages = true;
            while (morePages) {
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query, page: currentPage, exam }),
                });
                const data = await response.json();
                allFetched.push(...(data.results || []));
                if (data.results.length < (data.page_size || 10)) morePages = false;
                else currentPage++;
            }
            setAllResults(allFetched);
        } else {
            setAllResults([]);
        }
    };

    const handlePageChange = (p) => doSearch(query, p, { exam });

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* 🧭 Sidebar */}
            <Sidebar exam={exam} setExam={setExam} examsList={examsList} onOpenSecondarySidebar={() => {}} />

            {/* 📚 Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-start p-8 pl-64 transition-all duration-300 relative">
                {/* Language Toggle - Fixed at top right corner */}
                <div className="fixed top-4 right-4 z-50">
                    <button
                        onClick={() => setLanguage(language === "english" ? "hindi" : "english")}
                        className="px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
                        title={language === "english" ? "Switch to Hindi" : "Switch to English"}
                    >
                        {language === "english" ? (
                            <span className="text-sm font-semibold text-gray-700">EN</span>
                        ) : (
                            <span className="text-sm font-semibold text-gray-700">हि</span>
                        )}
                    </button>
                </div>

                {/* Exam Filter - Fixed/Sticky Position */}
                <div className="fixed left-64 top-8 z-30 flex flex-col gap-1.5 pl-3 bg-gray-50 py-2 pr-2 rounded-r-lg shadow-sm exam-filter-compact" style={{ width: '140px' }}>
                    <label className="text-base font-medium text-gray-700 whitespace-nowrap text-center">
                        Exam
                    </label>
                    <select
                        value={exam}
                        onChange={(e) => setExam(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full shadow-sm"
                    >
                        <option value="">All Exams</option>
                        {examsList.map((ex, idx) => (
                            <option key={idx} value={ex}>
                                {ex}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-full space-y-6 px-4 md:px-0">
                    {/* Content Container */}
                    <div className="max-w-3xl w-full mx-auto space-y-6 results-parent-container">
                        {/* Header with Heading Centered - Shifts with explanation window */}
                        <div className={`flex items-center justify-center relative w-full ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted mb-8' : 'mb-8'}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                            <h1 className="text-3xl font-bold">
                                AI PYQ Search
                            </h1>
                        </div>

                        {/* Search Bar */}
                        <div className={`flex flex-col sm:flex-row gap-3 justify-center ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search PYQs or topics (e.g. Article 15, Fundamental Rights...)"
                            className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            className={`px-6 py-2 rounded-lg text-white font-medium ${loading
                                    ? "bg-gray-400"
                                    : "bg-blue-600 hover:bg-blue-700 transition"
                                }`}
                            disabled={loading}
                        >
                            {loading ? "Searching..." : "Search"}
                        </button>
                    </div>

                    {/* Conditional Rendering */}
                    {!hasSearched ? (
                        <p className="text-gray-500 text-center mt-10">
                            Type a topic or question to begin searching.
                        </p>
                    ) : results.length === 0 ? (
                        <p className="text-gray-500 text-center mt-10">
                            No results found. Try refining your query or filters.
                        </p>
                    ) : (
                        <>
                            {exam === "" && page === 1 && allResults.length > 0 && (
                                <div className={`mx-auto space-y-6 ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: '48rem', width: '100%' }}>
                                    <ResultsChart results={allResults} />
                                </div>
                            )}
                            <ResultsList 
                                results={results} 
                                onExplanationWindowChange={(isOpen, isMinimized) => {
                                    setExplanationWindowOpen(isOpen);
                                    setExplanationWindowMinimized(isMinimized);
                                }}
                            />
                            <div className={`${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
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