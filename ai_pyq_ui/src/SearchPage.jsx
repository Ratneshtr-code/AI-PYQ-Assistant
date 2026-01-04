// src/SearchPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useSearchAPI } from "./hooks/useSearchAPI";
import { useLanguage } from "./contexts/LanguageContext";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import ResultsList from "./components/ResultsList";
import Pagination from "./components/Pagination";
import ResultsChart from "./components/ResultsChart";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function SearchPage() {
    const apiUrl = buildApiUrl("search");
    const filtersUrl = buildApiUrl("filters");
    const isMobile = useMobileDetection();

    // Initialize with empty state (fresh load)
    const [query, setQuery] = useState("");
    const [exam, setExam] = useState("");
    const [examsList, setExamsList] = useState([]);
    const { language, setLanguage } = useLanguage(); // Get language from context
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
                console.log("🔍 [Search Page] Fetching exams from:", filtersUrl);
                const res = await fetch(filtersUrl, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });
                console.log("📡 [Search Page] Response status:", res.status, res.statusText);
                
                if (!res.ok) {
                    const text = await res.text();
                    console.error("❌ [Search Page] Failed to fetch exams. Status:", res.status, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await res.text();
                    console.error("❌ [Search Page] Response is not JSON. Content-Type:", contentType, "Response:", text.substring(0, 200));
                    setExamsList([]);
                    return;
                }
                
                const data = await res.json();
                console.log("✅ [Search Page] Exams data received:", data);
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("❌ [Search Page] Error fetching exam filters:", err);
                setExamsList([]);
            }
        };
        fetchExams();
    }, []);

    // Handle URL query params only (no localStorage restoration on mount)
    // This ensures fresh load always starts with empty search bar

    // Handle URL query params only (if someone shares a link with query)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const initialQuery = params.get("query");
        const initialExam = params.get("exam");
        
        // If URL has query param, use it
        if (initialQuery) {
            setQuery(initialQuery);
            if (initialExam) setExam(initialExam);
            doSearch(initialQuery, 1, { exam: initialExam || "" });
        }
    }, [location.search]);

    // Optional: Save state for navigation back (can be removed if not needed)
    // Only save when user has actually performed a search
    useEffect(() => {
        if (hasSearched && query.trim()) {
            const stateToSave = {
                query,
                exam,
                page: page || 1,
                timestamp: Date.now(),
            };
            localStorage.setItem("searchPageState", JSON.stringify(stateToSave));
        }
    }, [query, exam, page, hasSearched]);

    // Debounce timer ref for auto-search
    const autoSearchTimerRef = useRef(null);
    const lastSearchParamsRef = useRef({ exam: "", language: "en" });

    // Auto-search when exam or language changes if query exists
    // Added debouncing and duplicate check to prevent multiple requests
    useEffect(() => {
        // Clear any pending auto-search
        if (autoSearchTimerRef.current) {
            clearTimeout(autoSearchTimerRef.current);
        }

        // Check if exam or language actually changed
        const currentParams = { exam: exam || "", language: language || "en" };
        const paramsChanged = 
            currentParams.exam !== lastSearchParamsRef.current.exam ||
            currentParams.language !== lastSearchParamsRef.current.language;

        if (!paramsChanged) {
            // No change, don't search
            return;
        }

        // Update last params
        lastSearchParamsRef.current = currentParams;

        // Only auto-search if query exists and user has searched before
        if (query.trim() && hasSearched && !loading) {
            // Debounce: Wait 300ms before triggering search
            // This prevents rapid filter changes from causing multiple requests
            autoSearchTimerRef.current = setTimeout(() => {
                // Double-check we're not already loading
                if (!loading) {
                    handleSearch();
                }
            }, 300);
        }

        // Cleanup on unmount or dependency change
        return () => {
            if (autoSearchTimerRef.current) {
                clearTimeout(autoSearchTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam, language, query, hasSearched, loading]);

    const handleSearch = useCallback(async () => {
        // Prevent double-clicks and concurrent searches
        if (!query.trim() || loading) {
            return;
        }
        
        await doSearch(query, 1, { exam, language });

        if (exam === "") {
            const allFetched = [];
            let currentPage = 1;
            let morePages = true;
            while (morePages) {
                const response = await fetch(buildApiUrl("search"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query, page: currentPage, exam, language }),
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
    }, [query, exam, language, loading, doSearch, apiUrl]);

    const handlePageChange = (p) => doSearch(query, p, { exam, language });

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* 🧭 Sidebar */}
            <Sidebar exam={exam} setExam={setExam} examsList={examsList} onOpenSecondarySidebar={() => {}} />

            {/* 📚 Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-start p-2 md:p-8 md:pl-64 transition-all duration-300 relative">

                {/* Desktop: Language Toggle - Top Right Corner */}
                {!isMobile && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                        className="fixed top-8 right-8 z-30 px-4 py-2.5 rounded-lg border border-gray-300/80 bg-white/90 hover:bg-white hover:border-blue-400 transition-all shadow-sm hover:shadow-md flex items-center justify-center backdrop-blur-sm min-w-[60px]"
                        title={language === "en" ? "Switch to Hindi" : "Switch to English"}
                    >
                        {language === "en" ? (
                            <span className="text-sm font-bold text-gray-700">EN</span>
                        ) : (
                            <span className="text-sm font-bold text-gray-700">हि</span>
                        )}
                    </motion.button>
                )}

                {/* Desktop: Exam Filter - Fixed/Sticky Position */}
                {!isMobile && (
                    <div className="fixed left-64 top-8 z-30 flex flex-col gap-1.5 pl-3 bg-gray-50 py-2 pr-2 rounded-r-lg shadow-sm exam-filter-compact w-auto" style={{ maxWidth: '140px' }}>
                        <label className="text-base font-medium text-gray-700 whitespace-nowrap text-center">
                            Exam
                        </label>
                        <select
                            value={exam}
                            onChange={(e) => setExam(e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full shadow-sm"
                        >
                            <option value="">All Exams</option>
                            {examsList.map((ex, idx) => (
                                <option key={idx} value={ex}>
                                    {ex}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="w-full space-y-4 md:space-y-6 px-2 md:px-4 md:px-0">
                    {/* Content Container */}
                    <div className="max-w-3xl w-full mx-auto space-y-4 md:space-y-6 results-parent-container">
                        {/* Mobile: Filter and Language Toggle Row */}
                        {isMobile && (
                            <div className="flex items-center gap-3 mb-4">
                                {/* Exam Filter */}
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">
                                        Exam
                                    </label>
                                    <select
                                        value={exam}
                                        onChange={(e) => setExam(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-full shadow-sm"
                                    >
                                        <option value="">All Exams</option>
                                        {examsList.map((ex, idx) => (
                                            <option key={idx} value={ex}>
                                                {ex}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Language Toggle */}
                                <div className="flex-shrink-0">
                                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                                        Language
                                    </label>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                                        className="px-4 py-2.5 rounded-lg border border-gray-300/80 bg-white hover:bg-gray-50 hover:border-blue-400 transition-all shadow-sm flex items-center justify-center min-w-[60px]"
                                        title={language === "en" ? "Switch to Hindi" : "Switch to English"}
                                    >
                                        {language === "en" ? (
                                            <span className="text-sm font-bold text-gray-700">EN</span>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-700">हि</span>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* Header with Heading Centered - Shifts with explanation window */}
                        <div className={`flex items-center justify-center relative w-full ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted mb-8' : 'mb-8'}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>
                                AI PYQ Search
                            </h1>
                        </div>

                        {/* Search Bar */}
                        <div className={`flex flex-col gap-3 ${explanationWindowOpen && !explanationWindowMinimized ? 'results-container-shifted' : ''}`} style={{ maxWidth: explanationWindowOpen && !explanationWindowMinimized ? '48rem' : '100%', width: '100%', marginLeft: 'auto', marginRight: explanationWindowOpen && !explanationWindowMinimized ? '440px' : 'auto' }}>
                            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3 justify-center items-center`}>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={isMobile ? "Search PYQs or topics..." : "Search PYQs or topics (e.g. Article 15, Fundamental Rights...)"}
                                    className={`${isMobile ? 'w-full' : 'flex-1'} border-2 border-gray-300 rounded-xl p-3.5 ${isMobile ? 'text-base' : 'text-sm'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm`}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                                <button
                                    onClick={() => {
                                        if (!loading) {
                                            handleSearch();
                                        }
                                    }}
                                    disabled={loading}
                                    className={`${isMobile ? 'w-full' : 'px-6'} py-3.5 rounded-xl text-white font-semibold ${isMobile ? 'text-base' : 'text-sm'} shadow-md transition-all ${loading
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95"
                                        }`}
                                >
                                    {loading ? "Searching..." : "Search"}
                                </button>
                            </div>
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