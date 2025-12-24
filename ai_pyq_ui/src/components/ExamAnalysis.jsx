// src/components/ExamAnalysis.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { motion } from "framer-motion";
import InsightsWindow from "./InsightsWindow";

export default function ExamAnalysis({ exam, yearFrom, yearTo }) {
    const [subjectData, setSubjectData] = useState([]);
    const [topicData, setTopicData] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch available subjects
    useEffect(() => {
        if (!exam) return;

        fetch(`http://127.0.0.1:8000/dashboard/filters?exam=${encodeURIComponent(exam)}`)
            .then((res) => res.json())
            .then((result) => {
                if (result.subjects) {
                    setAvailableSubjects(result.subjects);
                }
            })
            .catch((err) => {
                console.error("Error fetching subjects:", err);
            });
    }, [exam]);

    // Fetch subject weightage
    useEffect(() => {
        if (!exam) {
            setSubjectData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let url = `http://127.0.0.1:8000/dashboard/subject-weightage?exam=${encodeURIComponent(exam)}`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.subjects && result.subjects.length > 0) {
                    setSubjectData(result.subjects);
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
    }, [exam, yearFrom, yearTo]);

    // Fetch topic weightage for selected subject
    useEffect(() => {
        if (!exam || !selectedSubject) {
            setTopicData([]);
            return;
        }

        let url = `http://127.0.0.1:8000/dashboard/topic-weightage?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(selectedSubject)}`;
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
    }, [exam, selectedSubject, yearFrom, yearTo]);

    const getSubjectColor = (percentage) => {
        if (percentage >= 20) return "#1e40af";
        if (percentage >= 15) return "#3b82f6";
        if (percentage >= 10) return "#60a5fa";
        if (percentage >= 5) return "#93c5fd";
        return "#dbeafe";
    };

    const getTopicColor = (percentage) => {
        if (percentage >= 15) return "#059669";
        if (percentage >= 10) return "#10b981";
        if (percentage >= 5) return "#34d399";
        return "#a7f3d0";
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
    const subjectHeight = Math.max(300, subjectData.length * 45);
    // Topic Distribution: consistent spacing (40px per item) for better readability
    // Ensure minimum height even for 1 item to prevent centering, but start from top
    const topicHeight = topicData.length > 0 ? Math.max(150, topicData.length * 40) : 300;

    return (
        <div className="space-y-6">
            {/* Windows 1 & 2 Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Window 1: Subject Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                    style={{ minHeight: `${subjectHeight + 120}px` }}
                >
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Subject Distribution</h3>
                        <p className="text-xs text-gray-500 mb-1">Click a subject to view its topics</p>
                        <p className="text-xs text-gray-400">Based on number of PYQs {yearFrom && yearTo ? `(${yearFrom}–${yearTo})` : ''}</p>
                    </div>

                    {subjectData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={subjectHeight}>
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
                                                fill={getSubjectColor(entry.percentage)}
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
                        <p className="text-gray-500 text-center py-8">No subject data available</p>
                    )}
                </motion.div>

                {/* Window 2: Topic Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                    style={{ minHeight: `${topicHeight + 120}px` }}
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
                        <ResponsiveContainer width="100%" height={topicHeight}>
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
                                            fill={getTopicColor(entry.percentage)}
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
                    ) : selectedSubject ? (
                        <p className="text-gray-500 text-center py-8">No topic data available for this subject</p>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Select a subject to view topics</p>
                    )}
                </motion.div>
            </div>

            {/* Window 3: Insights Window (Below) */}
            <InsightsWindow exam={exam} subject={selectedSubject} yearFrom={yearFrom} yearTo={yearTo} />
        </div>
    );
}

