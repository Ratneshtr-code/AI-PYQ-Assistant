// src/components/FilterBar.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

export default function FilterBar({
    exam,
    setExam,
    exams, // For multiple exams mode (Cross-Exam Insights)
    setExams, // For multiple exams mode
    onAddExam, // For multiple exams mode
    onRemoveExam, // For multiple exams mode
    maxExams, // Maximum exams allowed (for Cross-Exam Insights)
    examsList,
    subject,
    setSubject,
    subjectsList,
    topic,
    setTopic,
    topicsList,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    availableYears,
    showSubject = true,
    showExam = true,
    showTopic = false, // Show/hide Topic filter
    showYearRange = true, // Show/hide Year Range filter
    multipleExamsMode = false, // Enable multiple exams selection mode
    isMobile = false, // Mobile detection flag
    isExpanded = true, // Filter pane expanded state (mobile only)
    onToggleExpand // Toggle handler for filter pane (mobile only)
}) {
    const [localYearFrom, setLocalYearFrom] = useState(yearFrom || "");
    const [localYearTo, setLocalYearTo] = useState(yearTo || "");
    const { language, setLanguage } = useLanguage(); // Get language from context
    
    // Count active filters for badge display
    const getActiveFilterCount = () => {
        let count = 0;
        if (exam && exam !== "") count++;
        if (subject && subject !== "") count++;
        if (topic && topic !== "") count++;
        if (exams && exams.length > 0) count += exams.length;
        if (localYearFrom && localYearFrom !== "") count++;
        if (localYearTo && localYearTo !== "") count++;
        return count;
    };
    
    const activeFilterCount = getActiveFilterCount();
    
    // Check if any filters are active
    const hasActiveFilters = activeFilterCount > 0;
    
    // Determine if filters should be shown (always show on desktop, conditionally on mobile)
    const shouldShowFilters = !isMobile || isExpanded;

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
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6" style={{ position: 'relative', zIndex: 10 }}>
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-y border-blue-100/60 shadow-md"
            >
                <div className="py-3">
                    <div className="w-full px-2 md:px-3">
                        {/* Filter Container - Premium Styling */}
                        <div className="bg-white/80 backdrop-blur-md border border-blue-200/70 rounded-xl px-4 py-3 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full overflow-hidden relative">
                            {/* Subtle gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-blue-50/30 pointer-events-none rounded-2xl" />
                            
                            {/* Toggle Button - Mobile Only */}
                            {isMobile && onToggleExpand && (
                                <div className="md:hidden mb-3 relative z-20">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={onToggleExpand}
                                        className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <motion.svg 
                                                className="w-5 h-5" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                                />
                                            </motion.svg>
                                            <span className="font-semibold text-sm">
                                                {isExpanded ? "Hide Filters" : "Show Filters"}
                                            </span>
                                        </div>
                                    </motion.button>
                                </div>
                            )}
                            
                            {/* Filter Content - Collapsible on Mobile */}
                            <motion.div
                                initial={false}
                                animate={{
                                    height: shouldShowFilters ? "auto" : 0,
                                    opacity: shouldShowFilters ? 1 : 0
                                }}
                                transition={{
                                    duration: 0.3,
                                    ease: "easeInOut"
                                }}
                                className="overflow-hidden relative z-10"
                            >
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-3 overflow-hidden relative z-10 pointer-events-auto" style={{ position: 'relative', zIndex: 10 }}>
                            {/* Year Range */}
                            {showYearRange && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-semibold whitespace-nowrap flex-shrink-0">Year Range:</span>
                                    <select
                                        value={localYearFrom}
                                        onChange={(e) => setLocalYearFrom(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="bg-white/90 text-gray-900 border border-gray-300/80 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all hover:border-blue-400 hover:bg-white shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[100px] cursor-pointer relative z-20"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <option value="" className="text-gray-800">From</option>
                                        {availableYears?.map((year) => (
                                            <option key={year} value={year} className="text-gray-800">
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-gray-500 text-sm font-medium">to</span>
                                    <select
                                        value={localYearTo}
                                        onChange={(e) => setLocalYearTo(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="bg-white/90 text-gray-900 border border-gray-300/80 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all hover:border-blue-400 hover:bg-white shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[100px] cursor-pointer relative z-20"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <option value="" className="text-gray-800">To</option>
                                        {availableYears?.map((year) => (
                                            <option key={year} value={year} className="text-gray-800">
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Exam Filter - Single Exam Mode */}
                            {showExam && !multipleExamsMode && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-semibold whitespace-nowrap flex-shrink-0">Exam:</span>
                                    <select
                                        value={exam || ""}
                                        onChange={(e) => setExam(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="bg-white/90 text-gray-900 border border-gray-300/80 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all hover:border-blue-400 hover:bg-white shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[160px] md:max-w-[200px] truncate cursor-pointer relative z-20"
                                        style={{ textOverflow: 'ellipsis', touchAction: 'manipulation' }}
                                    >
                                        <option value="" className="text-gray-800">{showTopic ? "Select Exam" : "All Exams"}</option>
                                        {examsList?.map((ex, idx) => (
                                            <option key={idx} value={ex} className="text-gray-800">
                                                {ex}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Exam Filter - Multiple Exams Mode */}
                            {showExam && multipleExamsMode && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-semibold whitespace-nowrap flex-shrink-0">Exams:</span>
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value && onAddExam) {
                                                onAddExam(e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="bg-white/90 text-gray-900 border border-gray-300/80 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all hover:border-blue-400 hover:bg-white shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[150px] md:max-w-[200px] truncate cursor-pointer relative z-20"
                                        style={{ textOverflow: 'ellipsis', touchAction: 'manipulation' }}
                                    >
                                        <option value="" className="text-gray-800">+ Add Exam</option>
                                        {examsList
                                            ?.filter((ex) => !exams?.includes(ex))
                                            .map((ex, idx) => (
                                                <option key={idx} value={ex} className="text-gray-800">
                                                    {ex}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {/* Subject Filter */}
                            {showSubject && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-semibold whitespace-nowrap flex-shrink-0">Subject:</span>
                                    <select
                                        value={subject || ""}
                                        onChange={(e) => setSubject(e.target.value)}
                                        disabled={showExam && !exam}
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="bg-white/90 text-gray-900 border border-gray-300/80 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all hover:border-blue-400 hover:bg-white shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[160px] md:max-w-[200px] truncate disabled:bg-gray-100/80 disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-200 cursor-pointer relative z-20"
                                        style={{ textOverflow: 'ellipsis', touchAction: 'manipulation' }}
                                    >
                                        <option value="" className="text-gray-800">{showTopic ? "Select Subject" : "All Subjects"}</option>
                                        {subjectsList?.map((subj, idx) => (
                                            <option key={idx} value={subj} className="text-gray-800">
                                                {subj}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Topic Filter */}
                            {showTopic && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 min-w-0 flex-1">
                                    <span className="text-gray-700 text-sm font-semibold whitespace-nowrap flex-shrink-0">Topic:</span>
                                    <select
                                        value={topic || ""}
                                        onChange={(e) => setTopic(e.target.value)}
                                        disabled={!subject || !exam || !topicsList || topicsList.length === 0}
                                        onClick={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="bg-white/90 text-gray-900 border border-gray-300/80 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all hover:border-blue-400 hover:bg-white shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[160px] md:max-w-full truncate disabled:bg-gray-100/80 disabled:cursor-not-allowed disabled:text-gray-400 disabled:border-gray-200 cursor-pointer relative z-20"
                                        style={{ textOverflow: 'ellipsis', touchAction: 'manipulation' }}
                                    >
                                        <option value="" className="text-gray-800">Select Topic</option>
                                        {topicsList?.map((top, idx) => (
                                            <option key={idx} value={top} className="text-gray-800">
                                                {top}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Language Toggle Icon - Extreme Right */}
                            <div className="md:ml-auto flex-shrink-0 w-full md:w-auto">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setLanguage(language === "en" ? "hi" : "en")}
                                    className="w-full md:w-auto px-3 py-1.5 rounded-lg border border-gray-300/80 bg-white/90 hover:bg-white hover:border-blue-400 transition-all shadow-sm hover:shadow-md flex items-center justify-center backdrop-blur-sm"
                                    title={language === "en" ? "Switch to Hindi" : "Switch to English"}
                                >
                                    {language === "en" ? (
                                        <span className="text-sm font-bold text-gray-700">EN</span>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-700">हि</span>
                                    )}
                                </motion.button>
                            </div>

                            {/* Selected Exams Tags for Multiple Exams Mode */}
                            {showExam && multipleExamsMode && exams && exams.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200/60 relative z-10">
                                    {exams.map((examName) => (
                                        <motion.div
                                            key={examName}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow duration-300"
                                        >
                                            <span>{examName}</span>
                                            {onRemoveExam && (
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => onRemoveExam(examName)}
                                                    className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-white font-bold transition-colors text-xs"
                                                >
                                                    ×
                                                </motion.button>
                                            )}
                                        </motion.div>
                                    ))}
                                    {maxExams && exams.length >= maxExams && (
                                        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm">
                                            Max {maxExams} exams
                                        </div>
                                    )}
                                </div>
                            )}
                                </div>
                            </motion.div>
                    </div>
                </div>
                </div>
            </motion.div>
        </div>
    );
}

