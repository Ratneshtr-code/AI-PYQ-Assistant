// src/components/SubjectAnalysis.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { motion } from "framer-motion";
import InsightsWindow from "./InsightsWindow";

export default function SubjectAnalysis({ subject, yearFrom, yearTo, examsList }) {
    const [examData, setExamData] = useState([]);
    const [topicData, setTopicData] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [availableExams, setAvailableExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch available exams for this subject from all exams
    useEffect(() => {
        if (!subject) return;

        // Get exams that have this subject from all available exams
        const examPromises = (examsList || []).map((examName) =>
            fetch(
                `http://127.0.0.1:8000/dashboard/subject-weightage?exam=${encodeURIComponent(examName)}&year_from=${yearFrom || ""}&year_to=${yearTo || ""}`
            )
                .then((res) => res.json())
                .then((result) => {
                    const hasSubject = result.subjects?.some((s) => s.name.toLowerCase() === subject.toLowerCase());
                    return hasSubject ? examName : null;
                })
                .catch(() => null)
        );

        Promise.all(examPromises).then((results) => {
            const available = results.filter((e) => e !== null);
            setAvailableExams(available);
            // Auto-select first available exam if none is selected
            setSelectedExam((prev) => {
                if (prev && available.includes(prev)) {
                    return prev; // Keep current selection if still available
                }
                return available.length > 0 ? available[0] : null;
            });
        });
    }, [subject, yearFrom, yearTo, examsList]);

    // Fetch exam distribution for this subject from all exams
    useEffect(() => {
        if (!subject) {
            setExamData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch data for each exam from all available exams
        const examPromises = (examsList || []).map((examName) =>
            fetch(
                `http://127.0.0.1:8000/dashboard/topic-weightage?exam=${encodeURIComponent(examName)}&subject=${encodeURIComponent(subject)}${yearFrom ? `&year_from=${yearFrom}` : ""}${yearTo ? `&year_to=${yearTo}` : ""}`
            )
                .then((res) => res.json())
                .then((result) => ({
                    exam: examName,
                    count: result.total_questions || 0,
                }))
                .catch(() => ({ exam: examName, count: 0 }))
        );

        Promise.all(examPromises)
            .then((results) => {
                const filtered = results.filter((r) => r.count > 0);
                const total = filtered.reduce((sum, r) => sum + r.count, 0);
                const examDataWithPercentage = filtered.map((r) => ({
                    name: r.exam,
                    count: r.count,
                    percentage: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0,
                }));
                examDataWithPercentage.sort((a, b) => b.percentage - a.percentage);
                setExamData(examDataWithPercentage);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching exam distribution:", err);
                setError("Failed to load exam data");
                setLoading(false);
            });
    }, [subject, yearFrom, yearTo, examsList]);

    // Fetch topic distribution for selected exam and subject
    useEffect(() => {
        if (!subject || !selectedExam) {
            setTopicData([]);
            return;
        }

        let url = `http://127.0.0.1:8000/dashboard/topic-weightage?exam=${encodeURIComponent(selectedExam)}&subject=${encodeURIComponent(subject)}`;
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
    }, [subject, selectedExam, yearFrom, yearTo]);

    const getExamColor = (percentage) => {
        if (percentage >= 30) return "#1e40af";
        if (percentage >= 20) return "#3b82f6";
        if (percentage >= 10) return "#60a5fa";
        return "#93c5fd";
    };

    const getTopicColor = (percentage) => {
        // Desaturated green colors for Topic Distribution
        if (percentage >= 15) return "#4ade80"; // Lighter, less saturated
        if (percentage >= 10) return "#6ee7b7"; // Lighter, less saturated
        if (percentage >= 5) return "#86efac"; // Lighter, less saturated
        return "#bbf7d0"; // Lighter, less saturated
    };

    if (!subject) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Subject Analysis</h3>
                <p className="text-gray-500 text-center py-8">Please select a subject to view analysis</p>
            </div>
        );
    }

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

    // Calculate dynamic height based on actual data length (per chart)
    // Exam Distribution: tighter spacing (30px per item) for compact display
    const examHeight = Math.max(300, examData.length * 30);
    // Topic Distribution: consistent spacing (40px per item) for better readability
    // Ensure minimum height even for 1 item to prevent centering, but start from top
    const topicHeight = topicData.length > 0 ? Math.max(150, topicData.length * 40) : 300;

    return (
        <div className="space-y-6">
            {/* Windows 1 & 2 Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Window 1: Exam Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                    style={{ minHeight: `${examHeight + 120}px` }}
                >
                    <div className="mb-2">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Exam Distribution</h3>
                        <p className="text-xs text-gray-500 mb-1">PYQ distribution across exams for {subject}</p>
                        <p className="text-xs text-gray-400">Based on number of PYQs {yearFrom && yearTo ? `(${yearFrom}–${yearTo})` : ''}</p>
                    </div>

                    {examData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={examHeight}>
                            <BarChart
                                data={examData}
                                layout="vertical"
                                margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
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
                                            // Show count if available
                                            const count = props.payload.count || 0;
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
                                    onClick={(entry) => setSelectedExam(entry.name)}
                                    barSize={28}
                                >
                                    {examData.map((entry, index) => {
                                        const isSelected = selectedExam === entry.name;
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={getExamColor(entry.percentage)}
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
                                            const count = payload.count || 0;
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
                        <p className="text-gray-500 text-center py-8">No exam data available for this subject</p>
                    )}
                </motion.div>

                {/* Window 2: Topic Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                    style={{ minHeight: `${topicHeight + 120}px` }}
                >
                    <div className="mb-2">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Topic Distribution</h3>
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam:</label>
                            <select
                                value={selectedExam || ""}
                                onChange={(e) => setSelectedExam(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="">Select an exam</option>
                                {availableExams.map((exam) => (
                                    <option key={exam} value={exam}>
                                        {exam}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedExam && topicData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={topicHeight}>
                            <BarChart
                                data={topicData}
                                layout="vertical"
                                margin={{ top: 5, right: 60, left: 0, bottom: 5 }}
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
                    ) : selectedExam ? (
                        <p className="text-gray-500 text-center py-8">No topic data available for this exam</p>
                    ) : (
                        <p className="text-gray-500 text-center py-8">Select an exam to view topics</p>
                    )}
                </motion.div>
            </div>

            {/* Window 3: Insights Window (Below) */}
            <InsightsWindow exam={selectedExam} subject={subject} yearFrom={yearFrom} yearTo={yearTo} />
        </div>
    );
}

