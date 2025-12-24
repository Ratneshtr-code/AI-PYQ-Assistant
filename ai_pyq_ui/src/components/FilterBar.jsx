// src/components/FilterBar.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function FilterBar({
    exam,
    setExam,
    examsList,
    subject,
    setSubject,
    subjectsList,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    availableYears,
    showSubject = true,
    showExam = true
}) {
    const [localYearFrom, setLocalYearFrom] = useState(yearFrom || "");
    const [localYearTo, setLocalYearTo] = useState(yearTo || "");

    useEffect(() => {
        if (availableYears && availableYears.length > 0) {
            if (!localYearFrom && availableYears[0]) {
                setLocalYearFrom(availableYears[0]);
            }
            if (!localYearTo && availableYears[availableYears.length - 1]) {
                setLocalYearTo(availableYears[availableYears.length - 1]);
            }
        }
    }, [availableYears]);

    useEffect(() => {
        if (localYearFrom && setYearFrom) {
            setYearFrom(parseInt(localYearFrom));
        }
    }, [localYearFrom]);

    useEffect(() => {
        if (localYearTo && setYearTo) {
            setYearTo(parseInt(localYearTo));
        }
    }, [localYearTo]);

    return (
        <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg border-b border-indigo-400"
        >
            <div className="px-4 md:px-8 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Year Range */}
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                            <span className="text-white text-sm font-medium whitespace-nowrap">Year Range:</span>
                            <select
                                value={localYearFrom}
                                onChange={(e) => setLocalYearFrom(e.target.value)}
                                className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="" className="text-gray-800">From</option>
                                {availableYears?.map((year) => (
                                    <option key={year} value={year} className="text-gray-800">
                                        {year}
                                    </option>
                                ))}
                            </select>
                            <span className="text-white/80">to</span>
                            <select
                                value={localYearTo}
                                onChange={(e) => setLocalYearTo(e.target.value)}
                                className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                <option value="" className="text-gray-800">To</option>
                                {availableYears?.map((year) => (
                                    <option key={year} value={year} className="text-gray-800">
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Exam Filter */}
                        {showExam && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                                <span className="text-white text-sm font-medium whitespace-nowrap">Exam:</span>
                                <select
                                    value={exam || ""}
                                    onChange={(e) => setExam(e.target.value)}
                                    className="bg-white/20 text-white border border-white/30 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[150px]"
                                >
                                    <option value="" className="text-gray-800">All Exams</option>
                                    {examsList?.map((ex, idx) => (
                                        <option key={idx} value={ex} className="text-gray-800">
                                            {ex}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Subject Filter */}
                        {showSubject && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                                <span className="text-white text-sm font-medium whitespace-nowrap">Subject:</span>
                                <select
                                    value={subject || ""}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="bg-white/20 text-white border border-white/30 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[150px]"
                                >
                                    <option value="" className="text-gray-800">All Subjects</option>
                                    {subjectsList?.map((subj, idx) => (
                                        <option key={idx} value={subj} className="text-gray-800">
                                            {subj}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

