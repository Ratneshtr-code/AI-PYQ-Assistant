// src/SearchPage.jsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearchAPI } from "./hooks/useSearchAPI";
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
    const navigate = useNavigate();

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

    // 🟦 Fetch exam filters
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

    // 🟩 Handle ?query= param (used for “View Similar PYQs”)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const initialQuery = params.get("query");
        if (initialQuery) {
            setQuery(initialQuery);
            doSearch(initialQuery, 1, { exam: "" });
        }
    }, [location.search]);

    // 🟧 Handle search
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

    // 🧭 UI
    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* 🧭 Left Sidebar */}
            <aside className="w-64 bg-white shadow-md border-r border-gray-200 p-5 flex flex-col justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">PYQ Assistant</h2>

                    {/* Filter Section */}
                    <div className="mb-6">
                        <label className="block text-sm text-gray-500 mb-1">Filter by Exam</label>
                        <select
                            value={exam}
                            onChange={(e) => setExam(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="">All Exams</option>
                            {examsList.map((ex, idx) => (
                                <option key={idx} value={ex}>
                                    {ex}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dashboard Shortcut */}
                    <button
                        onClick={() => navigate("/exam-dashboard")}
                        className="w-full bg-blue-50 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-100 transition"
                    >
                        📊 View Exam Dashboard
                    </button>
                </div>

                {/* User Account Placeholder */}
                <div className="border-t pt-4">
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full text-sm text-gray-600 hover:text-gray-800 transition"
                    >
                        👤 Sign In / Sign Up
                    </button>
                </div>
            </aside>

            {/* 📚 Main Content Area */}
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold text-center">AI PYQ Search</h1>

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

                    {/* Error */}
                    {error && <p className="text-red-600 text-center">{error}</p>}

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
                            {/* Chart */}
                            {exam === "" && page === 1 && allResults.length > 0 && (
                                <ResultsChart results={allResults} />
                            )}

                            {/* Results */}
                            <ResultsList results={results} />

                            {/* Pagination */}
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
