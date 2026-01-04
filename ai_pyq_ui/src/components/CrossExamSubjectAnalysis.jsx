// src/components/CrossExamSubjectAnalysis.jsx
import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { buildApiUrl } from "../config/apiConfig";
import { useLanguage } from "../contexts/LanguageContext";

export default function CrossExamSubjectAnalysis({ exams, yearFrom, yearTo, selectedSubject, onSubjectSelect }) {
    const { language } = useLanguage(); // Get language from context
    const [subjectData, setSubjectData] = useState({});
    const [topicData, setTopicData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visibleExams, setVisibleExams] = useState(new Set(exams)); // Track which exams to show
    const [viewMode, setViewMode] = useState("count"); // "count" or "percentage"
    
    // Map to store translated subject name -> original English name
    // This is needed because backend filters by English subject name, but UI shows translated name
    const subjectNameMapRef = useRef({});
    
    // Track mapping readiness state
    const [mappingReady, setMappingReady] = useState(false);
    
    // Build mapping between translated and English subject names
    useEffect(() => {
        if (!exams || exams.length === 0) {
            subjectNameMapRef.current = {};
            setMappingReady(false);
            return;
        }
        
        // Reset mapping ready state when exams change
        setMappingReady(false);
        
        // Fetch subjects from first exam to build mapping
        const langParam = language === "hi" ? "hi" : "en";
        const firstExam = exams[0];
        let url = `${buildApiUrl("dashboard/subject-weightage")}?exam=${encodeURIComponent(firstExam)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }
        
        let englishUrl = `${buildApiUrl("dashboard/subject-weightage")}?exam=${encodeURIComponent(firstExam)}&language=en`;
        if (yearFrom) {
            englishUrl += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            englishUrl += `&year_to=${yearTo}`;
        }
        
        Promise.all([
            fetch(url).then(res => res.json()).catch(() => ({ subjects: [] })),
            language === "hi" ? fetch(englishUrl).then(res => res.json()).catch(() => ({ subjects: [] })) : Promise.resolve({ subjects: [] })
        ])
            .then(([result, englishResult]) => {
                const nameMap = {};
                if (language === "hi" && englishResult.subjects && result.subjects) {
                    // Map by index (assuming same order)
                    result.subjects.forEach((translatedSubj, index) => {
                        if (englishResult.subjects[index]) {
                            nameMap[translatedSubj.name] = englishResult.subjects[index].name;
                        }
                    });
                } else if (result.subjects) {
                    // For English, map is identity
                    result.subjects.forEach(subj => {
                        nameMap[subj.name] = subj.name;
                    });
                }
                subjectNameMapRef.current = nameMap;
                setMappingReady(true);
            })
            .catch((err) => {
                console.error("Error building subject name mapping:", err);
                // Fallback: use identity mapping
                subjectNameMapRef.current = {};
                setMappingReady(true);
            });
    }, [exams, yearFrom, yearTo, language]);

    // Fetch subject distribution
    useEffect(() => {
        if (!exams || exams.length === 0) {
            setSubjectData({});
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const examsStr = exams.join(",");
        const langParam = language === "hi" ? "hi" : "en";
        let url = `${buildApiUrl("dashboard/cross-exam/subject-distribution")}?exams=${encodeURIComponent(examsStr)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.exams) {
                    setSubjectData(result.exams);
                } else {
                    setSubjectData({});
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching subject distribution:", err);
                setError("Failed to load subject distribution");
                setLoading(false);
            });
    }, [exams, yearFrom, yearTo, language]);

    // Fetch topic distribution for selected subject
    useEffect(() => {
        if (!exams || exams.length === 0 || !selectedSubject || !mappingReady) {
            setTopicData({});
            return;
        }

        // Convert translated subject name to English for API call
        // Backend filters by English subject name, not translated name
        const englishSubjectName = subjectNameMapRef.current[selectedSubject] || selectedSubject;

        const examsStr = exams.join(",");
        const langParam = language === "hi" ? "hi" : "en";
        let url = `${buildApiUrl("dashboard/cross-exam/topic-distribution")}?exams=${encodeURIComponent(examsStr)}&subject=${encodeURIComponent(englishSubjectName)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.exams) {
                    setTopicData(result.exams);
                } else {
                    setTopicData({});
                }
            })
            .catch((err) => {
                console.error("Error fetching topic distribution:", err);
                setTopicData({});
            });
    }, [exams, selectedSubject, yearFrom, yearTo, language, mappingReady]);

    // Update visible exams when exams prop changes
    useEffect(() => {
        setVisibleExams(new Set(exams));
    }, [exams]);

    const getExamColor = (examName) => {
        const examIndex = exams.indexOf(examName);
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
        return colors[examIndex % colors.length];
    };

    const toggleExamVisibility = (exam) => {
        setVisibleExams((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(exam)) {
                newSet.delete(exam);
            } else {
                newSet.add(exam);
            }
            return newSet;
        });
    };

    // Prepare data for Section A: Subject Distribution
    const prepareSubjectChartData = () => {
        const allSubjects = new Set();
        Object.values(subjectData).forEach((examData) => {
            examData.subjects?.forEach((subj) => {
                allSubjects.add(subj.name);
            });
        });

        const chartData = Array.from(allSubjects).map((subject) => {
            const dataPoint = { name: subject };
            let total = 0;
            exams.forEach((exam) => {
                const examData = subjectData[exam];
                const subj = examData?.subjects?.find((s) => s.name === subject);
                const count = subj?.count || 0;
                dataPoint[exam] = count;
                total += count;
            });
            dataPoint.total = total;
            return dataPoint;
        });

        const sorted = chartData.sort((a, b) => b.total - a.total);

        // Convert to percentage if needed
        if (viewMode === "percentage") {
            return sorted.map((item) => {
                const newItem = { ...item };
                exams.forEach((exam) => {
                    const examData = subjectData[exam];
                    const examTotal = examData?.subjects?.reduce((sum, s) => sum + (s.count || 0), 0) || 1;
                    newItem[exam] = examTotal > 0 ? Math.round((item[exam] / examTotal) * 10000) / 100 : 0;
                });
                return newItem;
            });
        }

        return sorted;
    };

    // Prepare data for Section B: Topic Distribution
    const prepareTopicChartData = () => {
        const allTopics = new Set();
        Object.values(topicData).forEach((examData) => {
            examData.topics?.forEach((topic) => {
                allTopics.add(topic.name);
            });
        });

        const chartData = Array.from(allTopics).map((topic) => {
            const dataPoint = { name: topic };
            let total = 0;
            exams.forEach((exam) => {
                const examData = topicData[exam];
                const top = examData?.topics?.find((t) => t.name === topic);
                const count = top?.count || 0;
                dataPoint[exam] = count;
                total += count;
            });
            dataPoint.total = total;
            return dataPoint;
        });

        const sorted = chartData.sort((a, b) => b.total - a.total);

        // Convert to percentage if needed
        if (viewMode === "percentage") {
            return sorted.map((item) => {
                const newItem = { ...item };
                exams.forEach((exam) => {
                    const examData = topicData[exam];
                    const examTotal = examData?.topics?.reduce((sum, t) => sum + (t.count || 0), 0) || 1;
                    newItem[exam] = examTotal > 0 ? Math.round((item[exam] / examTotal) * 10000) / 100 : 0;
                });
                return newItem;
            });
        }

        return sorted;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Subject Analysis</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Subject Analysis</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    const subjectChartData = prepareSubjectChartData();
    const topicChartData = prepareTopicChartData();

    return (
        <div className="space-y-6">
            {/* Section A & B: Side by Side Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section A: Subject Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200 overflow-x-auto"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Subject Distribution</h3>
                        <p className="text-sm text-gray-500 mb-3">Click a subject to view its topics</p>
                        
                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            {/* View Mode Toggle */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                <button
                                    onClick={() => setViewMode("count")}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                        viewMode === "count"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    Count
                                </button>
                                <button
                                    onClick={() => setViewMode("percentage")}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                        viewMode === "percentage"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    %
                                </button>
                            </div>
                            
                            {/* Exam Visibility Toggles */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {exams.map((exam) => (
                                    <label
                                        key={exam}
                                        className="flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleExams.has(exam)}
                                            onChange={() => toggleExamVisibility(exam)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span
                                            className="text-xs font-medium"
                                            style={{ color: visibleExams.has(exam) ? getExamColor(exam) : "#9ca3af" }}
                                        >
                                            {exam}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    {subjectChartData.length > 0 ? (
                        <div className="w-full overflow-x-auto" style={{ minHeight: `${Math.max(400, subjectChartData.length * 50)}px` }}>
                            <ResponsiveContainer width="100%" height={Math.max(400, subjectChartData.length * 50)} minHeight={400}>
                            <BarChart
                                data={subjectChartData}
                                layout="vertical"
                                margin={{ top: 10, right: 80, left: 0, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, "dataMax"]}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={140}
                                    tick={{ fontSize: 11 }}
                                    interval={0}
                                />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (viewMode === "percentage") {
                                            return [`${value}%`, name];
                                        }
                                        return [value, name];
                                    }}
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                                {exams
                                    .filter((exam) => visibleExams.has(exam))
                                    .map((exam) => (
                                        <Bar
                                            key={exam}
                                            dataKey={exam}
                                            fill={getExamColor(exam)}
                                            radius={[0, 4, 4, 0]}
                                            onClick={(entry) => {
                                                if (onSubjectSelect) {
                                                    onSubjectSelect(entry.name);
                                                }
                                            }}
                                            style={{ cursor: "pointer" }}
                                        />
                                    ))}
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No subject data available</p>
                    )}
                    {selectedSubject && (
                        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                            <p className="text-sm text-blue-800">
                                <strong>Selected:</strong> {selectedSubject}
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* Section B: Topic Distribution (Always visible, shows message if no subject selected) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200 overflow-x-auto"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">
                            Topic Distribution
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                            {selectedSubject ? `Topics for ${selectedSubject}` : "Select a subject from the left chart"}
                        </p>
                        
                        {/* Controls - only show if subject is selected */}
                        {selectedSubject && (
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                {/* View Mode Toggle */}
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                    <button
                                        onClick={() => setViewMode("count")}
                                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                            viewMode === "count"
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        Count
                                    </button>
                                    <button
                                        onClick={() => setViewMode("percentage")}
                                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                            viewMode === "percentage"
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        %
                                    </button>
                                </div>
                                
                                {/* Exam Visibility Toggles */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {exams.map((exam) => (
                                        <label
                                            key={exam}
                                            className="flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visibleExams.has(exam)}
                                                onChange={() => toggleExamVisibility(exam)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: visibleExams.has(exam) ? getExamColor(exam) : "#9ca3af" }}
                                            >
                                                {exam}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {selectedSubject ? (
                        topicChartData.length > 0 ? (
                            <div className="w-full overflow-x-auto" style={{ minHeight: `${Math.max(400, topicChartData.length * 50)}px` }}>
                                <ResponsiveContainer width="100%" height={Math.max(400, topicChartData.length * 50)} minHeight={400}>
                                <BarChart
                                    data={topicChartData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 80, left: 0, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, "dataMax"]}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={140}
                                        tick={{ fontSize: 11 }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (viewMode === "percentage") {
                                                return [`${value}%`, name];
                                            }
                                            return [value, name];
                                        }}
                                        contentStyle={{
                                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Legend />
                                    {exams
                                        .filter((exam) => visibleExams.has(exam))
                                        .map((exam) => (
                                            <Bar
                                                key={exam}
                                                dataKey={exam}
                                                fill={getExamColor(exam)}
                                                radius={[0, 4, 4, 0]}
                                            />
                                        ))}
                                </BarChart>
                            </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No topic data available for {selectedSubject}</p>
                        )
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[400px]">
                            <div className="text-center">
                                <div className="text-4xl mb-4">👆</div>
                                <p className="text-gray-500 text-sm">
                                    Click on a subject in the left chart to view its topic distribution
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

