// src/components/FilterBar.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
    multipleExamsMode = false // Enable multiple exams selection mode
}) {
    const [localYearFrom, setLocalYearFrom] = useState(yearFrom || "");
    const [localYearTo, setLocalYearTo] = useState(yearTo || "");
    const [language, setLanguage] = useState("english"); // Language state (english/hindi)

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
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-y border-blue-100/80 shadow-sm"
            >
                <div className="py-4">
                    <div className="w-full px-2 md:px-3">
                        {/* Filter Container - Stretches horizontally to fit all elements on one line */}
                        <div className="bg-white/70 backdrop-blur-sm border border-blue-200/60 rounded-xl px-5 py-4 shadow-sm w-full overflow-hidden">
                        <div className="flex items-center gap-4 overflow-hidden">
                            {/* Year Range */}
                            {showYearRange && (
                                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-normal whitespace-nowrap flex-shrink-0">Year Range:</span>
                                    <select
                                        value={localYearFrom}
                                        onChange={(e) => setLocalYearFrom(e.target.value)}
                                        className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all hover:border-gray-400 shadow-sm min-w-[100px]"
                                    >
                                        <option value="" className="text-gray-800">From</option>
                                        {availableYears?.map((year) => (
                                            <option key={year} value={year} className="text-gray-800">
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-gray-500 text-sm font-normal">to</span>
                                    <select
                                        value={localYearTo}
                                        onChange={(e) => setLocalYearTo(e.target.value)}
                                        className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all hover:border-gray-400 shadow-sm min-w-[100px]"
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
                                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-normal whitespace-nowrap flex-shrink-0">Exam:</span>
                                    <select
                                        value={exam || ""}
                                        onChange={(e) => setExam(e.target.value)}
                                        className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all hover:border-gray-400 shadow-sm min-w-[160px] max-w-[200px] truncate"
                                        style={{ textOverflow: 'ellipsis' }}
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
                                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-normal whitespace-nowrap flex-shrink-0">Exams:</span>
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value && onAddExam) {
                                                onAddExam(e.target.value);
                                                e.target.value = "";
                                            }
                                        }}
                                        className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all hover:border-gray-400 shadow-sm min-w-[150px] max-w-[200px] truncate"
                                        style={{ textOverflow: 'ellipsis' }}
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
                                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                                    <span className="text-gray-700 text-sm font-normal whitespace-nowrap flex-shrink-0">Subject:</span>
                                    <select
                                        value={subject || ""}
                                        onChange={(e) => setSubject(e.target.value)}
                                        disabled={showExam && !exam}
                                        className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all hover:border-gray-400 shadow-sm min-w-[160px] max-w-[200px] truncate disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        style={{ textOverflow: 'ellipsis' }}
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
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-gray-700 text-sm font-normal whitespace-nowrap flex-shrink-0">Topic:</span>
                                    <select
                                        value={topic || ""}
                                        onChange={(e) => setTopic(e.target.value)}
                                        disabled={!subject || !exam || !topicsList || topicsList.length === 0}
                                        className="bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all hover:border-gray-400 shadow-sm min-w-[160px] max-w-full truncate disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        style={{ textOverflow: 'ellipsis', width: '100%' }}
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
                            <div className="ml-auto flex-shrink-0">
                                <button
                                    onClick={() => setLanguage(language === "english" ? "hindi" : "english")}
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
                                    title={language === "english" ? "Switch to Hindi" : "Switch to English"}
                                >
                                    {language === "english" ? (
                                        <span className="text-sm font-semibold text-gray-700">EN</span>
                                    ) : (
                                        <span className="text-sm font-semibold text-gray-700">हि</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Selected Exams Tags for Multiple Exams Mode */}
                        {showExam && multipleExamsMode && exams && exams.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                                {exams.map((examName) => (
                                    <div
                                        key={examName}
                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                    >
                                        <span>{examName}</span>
                                        {onRemoveExam && (
                                            <button
                                                onClick={() => onRemoveExam(examName)}
                                                className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center text-blue-600 font-semibold"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {maxExams && exams.length >= maxExams && (
                                    <div className="text-yellow-600 text-xs font-medium">
                                        Max {maxExams} exams
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </motion.div>
        </div>
    );
}

