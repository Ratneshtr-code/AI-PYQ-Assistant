// src/SearchPage.jsx
import { useState, useEffect } from "react";
import { useSearchAPI } from "./hooks/useSearchAPI";
import ResultsList from "./components/ResultsList";
import Pagination from "./components/Pagination";
import ResultsChart from "./components/ResultsChart";

export default function SearchPage() {
    const apiUrl = "http://127.0.0.1:8000/search";
    const filtersUrl = "http://127.0.0.1:8000/filters";

    const [query, setQuery] = useState("");
    const [exam, setExam] = useState("");
    const [examsList, setExamsList] = useState([]); // ✅ dynamic exams from backend
    const [allResults, setAllResults] = useState([]);

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

    // 🟦 Fetch available exams for dropdown
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

    // 🟦 Trigger search normally
    const handleSearch = async () => {
        await doSearch(query, 1, { exam });

        // ✅ If All Exams selected → build chart data from ALL pages
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
                } else {
                    currentPage++;
                }
            }
            setAllResults(allFetched);
        } else {
            setAllResults([]);
        }
    };

    // 🟧 Pagination
    const handlePageChange = (p) => doSearch(query, p, { exam });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
                AI PYQ Search
            </h1>

            {/* 🔍 Search bar */}
            <div className="max-w-2xl mx-auto flex gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type your question or topic (e.g. 'Article 15')"
                    className="flex-1 border border-gray-300 rounded-lg p-3"
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    disabled={loading}
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </div>

            {/* 🎯 Dynamic Exam Filter */}
            <div className="max-w-2xl mx-auto flex flex-wrap gap-3 mb-6">
                <select
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                    className="border border-gray-300 rounded-lg p-3 flex-1"
                >
                    <option value="">All Exams</option>
                    {examsList.map((ex, idx) => (
                        <option key={idx} value={ex}>
                            {ex}
                        </option>
                    ))}
                </select>
            </div>

            {/* ⚠️ Error Message */}
            {error && <p className="text-red-600 text-center mb-4">{error}</p>}

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
                    {/* 📊 Chart (only on 1st page + All Exams) */}
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
    );
}
