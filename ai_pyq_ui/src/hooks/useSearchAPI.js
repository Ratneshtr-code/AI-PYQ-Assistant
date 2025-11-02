// src/hooks/useSearchAPI.js
import { useState } from "react";
import axios from "axios";

export function useSearchAPI(apiUrl) {
	const [results, setResults] = useState([]);
	const [totalMatches, setTotalMatches] = useState(0);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [hasSearched, setHasSearched] = useState(false);

	// query = search term
	// filters = optional filter object
	const doSearch = async (query, targetPage = 1, filters = {}) => {
		if (!query.trim()) return;
		setLoading(true);
		setError("");

		try {
			const payload = {
				query: query.trim(),
				page: targetPage,
				exam: filters.exam || "",
			};

			const res = await axios.post(apiUrl, payload, { timeout: 10000 });
			const data = res.data;

			setResults(data.results || []);
			setTotalMatches(data.total_matches || 0);
			setPage(targetPage);
			setPageSize(data.page_size || 10);
			setHasSearched(true);
		} catch (err) {
			console.error("❌ Search API Error:", err);
			setError("Error fetching results. Check backend connection.");
		} finally {
			setLoading(false);
		}
	};


	return {
		results,
		totalMatches,
		page,
		pageSize,
		loading,
		error,
		hasSearched,
		doSearch,
	};
}
