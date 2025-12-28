// src/components/NotesFilterBar.jsx
import { useState, useEffect } from "react";

export default function NotesFilterBar({ filters, onFilterChange, stats }) {
    const [localFilters, setLocalFilters] = useState(filters);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        const clearedFilters = {
            exam: null,
            subject: null,
            year: null,
            sort_by: "date",
            sort_order: "desc",
        };
        setLocalFilters(clearedFilters);
        onFilterChange(clearedFilters);
    };

    // Get unique values from stats
    const exams = stats?.by_exam ? Object.keys(stats.by_exam).sort() : [];
    const subjects = stats?.by_subject ? Object.keys(stats.by_subject).sort() : [];
    const years = stats?.by_year ? Object.keys(stats.by_year).map(Number).sort((a, b) => b - a) : [];

    const hasActiveFilters = localFilters.exam || localFilters.subject || localFilters.year;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Active
                        </span>
                    )}
                </button>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Exam Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Exam
                            </label>
                            <select
                                value={localFilters.exam || ""}
                                onChange={(e) => handleFilterChange("exam", e.target.value || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Exams</option>
                                {exams.map((exam) => (
                                    <option key={exam} value={exam}>
                                        {exam} ({stats?.by_exam[exam] || 0})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subject
                            </label>
                            <select
                                value={localFilters.subject || ""}
                                onChange={(e) => handleFilterChange("subject", e.target.value || null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Subjects</option>
                                {subjects.map((subject) => (
                                    <option key={subject} value={subject}>
                                        {subject} ({stats?.by_subject[subject] || 0})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Year Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Year
                            </label>
                            <select
                                value={localFilters.year || ""}
                                onChange={(e) => handleFilterChange("year", e.target.value ? parseInt(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Years</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year} ({stats?.by_year[year] || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sort Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sort By
                            </label>
                            <select
                                value={localFilters.sort_by}
                                onChange={(e) => handleFilterChange("sort_by", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="date">Date</option>
                                <option value="exam">Exam</option>
                                <option value="subject">Subject</option>
                                <option value="year">Year</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Order
                            </label>
                            <select
                                value={localFilters.sort_order}
                                onChange={(e) => handleFilterChange("sort_order", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

