// src/SearchPage.jsx
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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

    // Fetch exams
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

    // Handle ?query= param
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const initialQuery = params.get("query");
        if (initialQuery) {
            setQuery(initialQuery);
            doSearch(initialQuery, 1, { exam: "" });
        }
    }, [location.search]);

    // Handle search
    const handleSearch = async () => {
        if (!query.trim()) return;
        await doSearch(query, 1, { exam });

        // If "All Exams" → fetch all pages for chart
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
                if (data.results.length < (data.page_size || 10)) {
                    morePages = false;
                } else currentPage++;
            }
            setAllResults(allFetched);
        } else {
            setAllResults([]);
        }
    };

    const handlePageChange = (p) => doSearch(query, p, { exam });

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4 space-y-6">
                <h1 className="text-3xl font-bold text-center text-gray-800">
                    AI PYQ Search
                </h1>

                {/* 🔍 Search + Filter Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type your question or topic (e.g. 'Article 15')"
                        className="flex-1 border border-gray-300 rounded-lg p-3"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <select
                        value={exam}
                        onChange={(e) => setExam(e.target.value)}
                        className="border border-gray-300 rounded-lg p-3 sm:w-40"
                    >
                        <option value="">All Exams</option>
                        {examsList.map((ex, idx) => (
                            <option key={idx} value={ex}>
                                {ex}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleSearch}
                        className={`px-5 py-2 rounded-lg text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
                        disabled={loading}
                    >
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>

                {/* ⚠️ Error */}
                {error && <p className="text-red-600 text-center">{error}</p>}

                {/* 🧭 Conditional Rendering */}
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
                        {/* 📊 Chart */}
                        {exam === "" && page === 1 && allResults.length > 0 && (
                            <ResultsChart results={allResults} />
                        )}

                        {/* 🧾 Results */}
                        <ResultsList results={results} />

                        {/* 🔢 Pagination */}
                        <Pagination
                            page={page}
                            totalMatches={totalMatches}
                            pageSize={pageSize}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
