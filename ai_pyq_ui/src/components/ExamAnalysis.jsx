// src/components/ExamAnalysis.jsx
import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { motion } from "framer-motion";
import { buildApiUrl } from "../config/apiConfig";
import InsightsWindow from "./InsightsWindow";
import { useLanguage } from "../contexts/LanguageContext";

export default function ExamAnalysis({ exam, yearFrom, yearTo }) {
    const { language } = useLanguage(); // Get language from context
    const [subjectData, setSubjectData] = useState([]);
    const [topicData, setTopicData] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Map to store translated name -> original English name
    // This is needed because backend filters by English name, but UI shows translated name
    const subjectNameMapRef = useRef({});
    const subjectChartRef = useRef(null);
    const topicChartRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    // Detect mobile and container width
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Set initial width immediately, accounting for padding (32px on each side = 64px total)
            const initialWidth = window.innerWidth - 64;
            setContainerWidth(initialWidth > 0 ? initialWidth : window.innerWidth);
        };
        
        // Set immediately
        checkMobile();
        
        // Also set after a small delay to ensure DOM is ready
        const timer = setTimeout(checkMobile, 0);
        
        window.addEventListener('resize', checkMobile);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
            clearTimeout(timer);
        };
    }, []);

    // Update container width when chart refs are available
    useEffect(() => {
        const updateWidth = () => {
            if (subjectChartRef.current) {
                const rect = subjectChartRef.current.getBoundingClientRect();
                const width = rect.width || subjectChartRef.current.offsetWidth || subjectChartRef.current.clientWidth;
                if (width > 0) {
                    setContainerWidth(width);
                } else {
                    // Fallback to window width minus padding
                    const fallbackWidth = window.innerWidth - 64; // Account for padding
                    setContainerWidth(fallbackWidth);
                }
            } else {
                // Fallback to window width minus padding
                const fallbackWidth = window.innerWidth - 64;
                setContainerWidth(fallbackWidth);
            }
        };
        
        updateWidth();
        const timer1 = setTimeout(updateWidth, 50);
        const timer2 = setTimeout(updateWidth, 200);
        const timer3 = setTimeout(updateWidth, 500);
        
        window.addEventListener('resize', updateWidth);
        
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [subjectData.length, topicData.length]);

    // Fetch available subjects
    useEffect(() => {
        if (!exam) return;

        const langParam = language === "hi" ? "hi" : "en";
        fetch(`${buildApiUrl("dashboard/filters")}?exam=${encodeURIComponent(exam)}&language=${langParam}`)
            .then((res) => res.json())
            .then((result) => {
                if (result.subjects) {
                    setAvailableSubjects(result.subjects);
                }
            })
            .catch((err) => {
                console.error("Error fetching subjects:", err);
            });
    }, [exam, language]);

    // Fetch subject weightage
    useEffect(() => {
        if (!exam) {
            setSubjectData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const langParam = language === "hi" ? "hi" : "en";
        let url = `${buildApiUrl("dashboard/subject-weightage")}?exam=${encodeURIComponent(exam)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        // Also fetch English version to build mapping between translated and English names
        let englishUrl = `${buildApiUrl("dashboard/subject-weightage")}?exam=${encodeURIComponent(exam)}&language=en`;
        if (yearFrom) {
            englishUrl += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            englishUrl += `&year_to=${yearTo}`;
        }

        Promise.all([
            fetch(url).then(res => res.json()),
            language === "hi" ? fetch(englishUrl).then(res => res.json()) : Promise.resolve({ subjects: [] })
        ])
            .then(([result, englishResult]) => {
                if (result.subjects && result.subjects.length > 0) {
                    setSubjectData(result.subjects);
                    
                    // Build mapping: translated name -> English name
                    const nameMap = {};
                    if (language === "hi" && englishResult.subjects && englishResult.subjects.length === result.subjects.length) {
                        // Map by index (assuming same order)
                        result.subjects.forEach((translatedSubj, index) => {
                            if (englishResult.subjects[index]) {
                                nameMap[translatedSubj.name] = englishResult.subjects[index].name;
                            }
                        });
                    } else {
                        // For English, map is identity
                        result.subjects.forEach(subj => {
                            nameMap[subj.name] = subj.name;
                        });
                    }
                    subjectNameMapRef.current = nameMap;
                    
                    // Auto-select first subject
                    if (!selectedSubject && result.subjects[0]) {
                        setSelectedSubject(result.subjects[0].name);
                    }
                } else {
                    setSubjectData([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching subject weightage:", err);
                setError("Failed to load subject data");
                setLoading(false);
            });
    }, [exam, yearFrom, yearTo, language]);

    // Fetch topic weightage for selected subject
    useEffect(() => {
        if (!exam || !selectedSubject) {
            setTopicData([]);
            return;
        }

        // Convert translated subject name to English for API call
        // Backend filters by English subject name, not translated name
        const englishSubjectName = subjectNameMapRef.current[selectedSubject] || selectedSubject;
        
        const langParam = language === "hi" ? "hi" : "en";
        let url = `${buildApiUrl("dashboard/topic-weightage")}?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(englishSubjectName)}&language=${langParam}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.topics && result.topics.length > 0) {
                    setTopicData(result.topics);
                } else {
                    setTopicData([]);
                }
            })
            .catch((err) => {
                console.error("Error fetching topic weightage:", err);
                setTopicData([]);
            });
    }, [exam, selectedSubject, yearFrom, yearTo, language]);

    // Categorical color palette for charts
    // Using a professional color scheme with good contrast and accessibility
    const colorPalette = [
        "#3b82f6", // Blue
        "#10b981", // Green
        "#f59e0b", // Amber
        "#ef4444", // Red
        "#8b5cf6", // Purple
        "#06b6d4", // Cyan
        "#f97316", // Orange
        "#ec4899", // Pink
        "#14b8a6", // Teal
        "#6366f1", // Indigo
        "#84cc16", // Lime
        "#f43f5e", // Rose
    ];

    const getSubjectColor = (index) => {
        // Cycle through the color palette for distinct subject colors
        return colorPalette[index % colorPalette.length];
    };

    const getTopicColor = (index) => {
        // Cycle through the color palette for distinct topic colors
        return colorPalette[index % colorPalette.length];
    };

    const handleSubjectClick = (subject) => {
        setSelectedSubject(subject.name);
    };

    if (!exam) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Exam Analysis</h3>
                <p className="text-gray-500 text-center py-8">Please select an exam to view analysis</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Exam Analysis</h3>
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
                <h3 className="text-xl font-semibold mb-4 text-red-600">Exam Analysis</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    // Calculate dynamic height based on actual data length (per chart)
    // Subject Distribution: more spacing for clarity
    const subjectHeight = subjectData.length > 0 ? Math.max(300, subjectData.length * 45) : 300;
    // Topic Distribution: consistent spacing (40px per item) for better readability
    // Ensure minimum height even for 1 item to prevent centering, but start from top
    const topicHeight = topicData.length > 0 ? Math.max(150, topicData.length * 40) : 300;

    return (
        <div className="space-y-6 w-full" style={{ width: '100%' }}>
            {/* Windows 1 & 2 Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full" style={{ width: '100%' }}>
                {/* Window 1: Subject Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200"
                    style={{ minHeight: `${subjectHeight + 120}px`, width: '100%' }}
                >
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Subject Distribution</h3>
                        <p className="text-xs text-gray-500 mb-1">Click a subject to view its topics</p>
                        <p className="text-xs text-gray-400">Based on number of PYQs {yearFrom && yearTo ? `(${yearFrom}–${yearTo})` : ''}</p>
                    </div>

                    {subjectData.length > 0 ? (
                        <div 
                            ref={subjectChartRef}
                            style={{ 
                                width: '100%',
                                height: `${subjectHeight}px`,
                                minHeight: `${subjectHeight}px`,
                                minWidth: '100%',
                                position: 'relative',
                                overflow: 'visible'
                            }}
                        >
                            {containerWidth > 0 ? (
                            <ResponsiveContainer 
                                width={isMobile ? containerWidth : "100%"} 
                                height={subjectHeight} 
                                minHeight={300}
                            >
                            <BarChart
                                data={subjectData}
                                layout="vertical"
                                margin={{ top: 10, right: 60, left: 0, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                    type="number" 
                                    domain={[0, "dataMax"]}
                                    tick={{ fontSize: 12 }}
                                    hide={true}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={160}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 'dataMax']}
                                    padding={{ top: 0, bottom: 0 }}
                                />
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        if (name === "percentage") {
                                            // Show count if available, otherwise calculate from percentage
                                            const count = props.payload.count || Math.round((value / 100) * (props.payload.total || 100));
                                            return `${count} PYQs`;
                                        }
                                        return value;
                                    }}
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar
                                    dataKey="percentage"
                                    radius={[0, 8, 8, 0]}
                                    cursor="pointer"
                                    onClick={(entry) => handleSubjectClick(entry)}
                                    barSize={28}
                                >
                                    {subjectData.map((entry, index) => {
                                        const isSelected = selectedSubject === entry.name;
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={getSubjectColor(index)}
                                                style={{
                                                    stroke: isSelected ? "#f59e0b" : "none",
                                                    strokeWidth: isSelected ? 3 : 0,
                                                    opacity: isSelected ? 1 : 0.9,
                                                }}
                                            />
                                        );
                                    })}
                                    <LabelList
                                        content={(props) => {
                                            const { x, y, width, payload } = props;
                                            if (!payload || !width) return null;
                                            const count = payload.count || Math.round((payload.percentage / 100) * (payload.total || 100));
                                            return (
                                                <text
                                                    x={x + width + 8}
                                                    y={y + 14}
                                                    fill="#6b7280"
                                                    fontSize={11}
                                                    textAnchor="start"
                                                >
                                                    {count}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                            ) : (
                                <div style={{ width: '100%', height: `${subjectHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p className="text-gray-500">Loading chart...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No subject data available</p>
                    )}
                </motion.div>

                {/* Window 2: Topic Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200"
                    style={{ minHeight: `${topicHeight + 120}px`, width: '100%' }}
                >
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Topic Distribution</h3>
                        <p className="text-xs text-gray-400 mb-2">Top topics within selected subject</p>
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Subject:
                            </label>
                            <select
                                value={selectedSubject || ""}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">Select a subject</option>
                                {availableSubjects.map((subj) => (
                                    <option key={subj} value={subj}>
                                        {subj}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedSubject && topicData.length > 0 ? (
                        <div 
                            ref={topicChartRef}
                            style={{ 
                                width: '100%',
                                height: `${topicHeight}px`,
                                minHeight: `${topicHeight}px`,
                                minWidth: '100%',
                                position: 'relative',
                                overflow: 'visible'
                            }}
                        >
                            {containerWidth > 0 ? (
                            <ResponsiveContainer 
                                width={isMobile ? containerWidth : "100%"} 
                                height={topicHeight} 
                                minHeight={300}
                            >
                            <BarChart
                                data={topicData}
                                layout="vertical"
                                margin={{ top: 10, right: 60, left: 0, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                    type="number" 
                                    domain={[0, "dataMax"]}
                                    tick={{ fontSize: 12 }}
                                    hide={true}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={180}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                    reversed={false}
                                    padding={{ top: 5, bottom: 5 }}
                                />
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        if (name === "percentage") {
                                            // Show count if available, otherwise calculate from percentage
                                            const count = props.payload.count || Math.round((value / 100) * (props.payload.total || 100));
                                            return `${count} PYQs`;
                                        }
                                        return value;
                                    }}
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={28}>
                                    {topicData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={getTopicColor(index)}
                                        />
                                    ))}
                                    <LabelList
                                        content={(props) => {
                                            const { x, y, width, payload } = props;
                                            if (!payload || !width) return null;
                                            const count = payload.count || Math.round((payload.percentage / 100) * (payload.total || 100));
                                            return (
                                                <text
                                                    x={x + width + 8}
                                                    y={y + 14}
                                                    fill="#6b7280"
                                                    fontSize={11}
                                                    textAnchor="start"
                                                >
                                                    {count}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                            ) : (
                                <div style={{ width: '100%', height: `${topicHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p className="text-gray-500">Loading chart...</p>
                                </div>
                            )}
                        </div>
                    ) : selectedSubject ? (
                        <p className="text-gray-500 text-center py-8">No topic data available for this subject</p>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Select a subject to view topics</p>
                    )}
                </motion.div>
            </div>

            {/* Window 3: Insights Window (Below) */}
            <InsightsWindow 
                exam={exam} 
                subject={selectedSubject ? (subjectNameMapRef.current[selectedSubject] || selectedSubject) : null} 
                yearFrom={yearFrom} 
                yearTo={yearTo} 
            />
        </div>
    );
}

