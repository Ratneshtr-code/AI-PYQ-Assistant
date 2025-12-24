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
    const [allResults, setAllResults] = useState([]);
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
            <main className="flex-1 flex flex-col items-center justify-start p-8 pl-64 transition-all duration-300">
                <div className="max-w-3xl w-full space-y-6 mx-0 md:mx-auto px-4 md:px-0">
                    <h1 className="text-3xl font-bold text-center">AI PYQ Search</h1>

                    {/* Exam Filter */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Exam
                        </label>
                        <select
                            value={exam}
                            onChange={(e) => setExam(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="">All Exams</option>
                            {examsList.map((ex, idx) => (
                                <option key={idx} value={ex}>
                                    {ex}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
                                <ResultsChart results={allResults} />
                            )}
                            <ResultsList results={results} />
                            <Pagination
                                page={page}
                                totalMatches={totalMatches}
                                pageSize={pageSize}
                                onPageChange={handlePageChange}
                            />
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
