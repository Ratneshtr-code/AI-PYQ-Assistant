// src/hooks/useSearchAPI.js
import { useState, useRef } from "react";
import axios from "axios";

export function useSearchAPI(apiUrl) {
	const [results, setResults] = useState([]);
	const [totalMatches, setTotalMatches] = useState(0);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [hasSearched, setHasSearched] = useState(false);
	
	// Use ref to store AbortController for request cancellation
	const abortControllerRef = useRef(null);

	// query = search term
	// filters = optional filter object
	const doSearch = async (query, targetPage = 1, filters = {}) => {
		if (!query.trim()) return;
		
		// Cancel previous request if it's still pending
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		
		// Create new AbortController for this request
		const abortController = new AbortController();
		abortControllerRef.current = abortController;
		
		setLoading(true);
		setError("");

		try {
			const payload = {
				query: query.trim(),
				page: targetPage,
				exam: filters.exam || "",
				subject: filters.subject || null,
				topic: filters.topic || null,
				language: filters.language || "en",
			};

			const res = await axios.post(apiUrl, payload, { 
				timeout: 10000,
				signal: abortController.signal  // Add cancellation signal
			});
			
			// Check if request was aborted
			if (abortController.signal.aborted) {
				return; // Don't update state if request was cancelled
			}
			
			const data = res.data;

			setResults(data.results || []);
			setTotalMatches(data.total_matches || 0);
			setPage(targetPage);
			setPageSize(data.page_size || 10);
			setHasSearched(true);
		} catch (err) {
			// Don't show error if request was cancelled (expected behavior)
			if (axios.isCancel(err) || err.name === 'AbortError' || abortController.signal.aborted) {
				return; // Silently ignore cancelled requests
			}
			console.error("❌ Search API Error:", err);
			setError("Error fetching results. Check backend connection.");
		} finally {
			// Only set loading to false if this request wasn't cancelled
			if (!abortController.signal.aborted) {
				setLoading(false);
			}
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
