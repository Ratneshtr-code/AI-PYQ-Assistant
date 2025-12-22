// src/components/ExamAnalysis.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

    return (
        <div className="space-y-6">
            {/* Windows 1 & 2 Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Window 1: Subject Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Subject Distribution</h3>
                        <p className="text-sm text-gray-500">Click a subject to view its topics</p>
                    </div>

                    {subjectData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(300, subjectData.length * 50)}>
                            <BarChart
                                data={subjectData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                    type="number" 
                                    domain={[0, "dataMax"]}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={180}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (name === "percentage") {
                                            return [`${value}%`, "Percentage"];
                                        }
                                        return [value, "Count"];
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
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Topic Distribution</h3>
                        <div className="mb-3">
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
                        <ResponsiveContainer width="100%" height={Math.max(300, topicData.length * 50)}>
                            <BarChart
                                data={topicData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                    type="number" 
                                    domain={[0, "dataMax"]}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={180}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (name === "percentage") {
                                            return [`${value}%`, "Percentage"];
                                        }
                                        return [value, "Count"];
                                    }}
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
                                    {topicData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={getTopicColor(entry.percentage)}
                                        />
                                    ))}
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

