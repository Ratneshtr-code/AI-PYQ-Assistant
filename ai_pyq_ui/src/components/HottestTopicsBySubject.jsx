// src/components/HottestTopicsBySubject.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { motion } from "framer-motion";

export default function HottestTopicsBySubject({ exam, subject, yearFrom, yearTo }) {
    const [subjectHotTopics, setSubjectHotTopics] = useState([]);
    const [subjectCoverage, setSubjectCoverage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch subject hot topics for specific exam and subject
    useEffect(() => {
        if (!exam || !subject) {
            setSubjectHotTopics([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let url = `http://127.0.0.1:8000/dashboard/hot-topics?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&min_years=1`;
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
                    const sorted = result.topics.sort((a, b) => b.total_count - a.total_count).slice(0, 10);
                    setSubjectHotTopics(sorted);
                } else {
                    setSubjectHotTopics([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching subject hot topics:", err);
                setError("Failed to load hot topics");
                setLoading(false);
            });
    }, [exam, subject, yearFrom, yearTo]);

    // Fetch subject coverage for specific exam and subject
    useEffect(() => {
        if (!exam || !subject) {
            setSubjectCoverage(null);
            return;
        }

        let url = `http://127.0.0.1:8000/dashboard/coverage?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}&top_n=10`;
        if (yearFrom) {
            url += `&year_from=${yearFrom}`;
        }
        if (yearTo) {
            url += `&year_to=${yearTo}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                setSubjectCoverage(result);
            })
            .catch((err) => {
                console.error("Error fetching subject coverage:", err);
            });
    }, [exam, subject, yearFrom, yearTo]);

    const getHotTopicColor = (index) => {
        const colors = ["#dc2626", "#ea580c", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6"];
        return colors[index % colors.length];
    };

    if (!exam || !subject) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Hottest Topics by Subject</h3>
                <p className="text-gray-500 text-center py-8">
                    {!exam && !subject 
                        ? "Please select an exam and a subject to view hot topics"
                        : !exam 
                        ? "Please select an exam to view hot topics"
                        : "Please select a subject to view hot topics"}
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Hottest Topics by Subject</h3>
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Hottest Topics by Subject</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    // Calculate dynamic height based on actual data length
    const subjectHotTopicsHeight = subjectHotTopics.length > 0 ? Math.max(200, subjectHotTopics.length * 35) : 300;

    return (
        <div className="space-y-6">
            {/* Windows 1 & 2 Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Window 1: Hottest Topics by Subject */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                    style={{ minHeight: `${subjectHotTopicsHeight + 120}px` }}
                >
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Hottest Topics ({exam} - {subject})</h3>
                        <p className="text-xs text-gray-500 mb-1">Top 10 most frequently asked topics</p>
                        <p className="text-xs text-gray-400">Based on number of PYQs {yearFrom && yearTo ? `(${yearFrom}–${yearTo})` : ''}</p>
                    </div>

                    {subjectHotTopics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={subjectHotTopicsHeight}>
                            <BarChart
                                data={subjectHotTopics}
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
                                    reversed={false}
                                    padding={{ top: 0, bottom: 0 }}
                                />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (name === "total_count") {
                                            return `${value} PYQs`;
                                        }
                                        return value;
                                    }}
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="total_count" radius={[0, 8, 8, 0]} barSize={22}>
                                    {subjectHotTopics.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getHotTopicColor(index)} />
                                    ))}
                                    <LabelList
                                        content={(props) => {
                                            const { x, y, width, payload } = props;
                                            if (!payload || !width) return null;
                                            return (
                                                <text
                                                    x={x + width + 8}
                                                    y={y + 14}
                                                    fill="#6b7280"
                                                    fontSize={11}
                                                    textAnchor="start"
                                                >
                                                    {payload.total_count}
                                                </text>
                                            );
                                        }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No hot topics available for this subject</p>
                    )}
                </motion.div>

                {/* Window 2: Coverage Bar for Subject Topics */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                    style={{ minHeight: `${subjectHotTopicsHeight + 120}px` }}
                >
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Subject Coverage Insight</h3>
                        <p className="text-xs text-gray-400">Coverage for {exam} - {subject}</p>
                    </div>

                    {subjectCoverage ? (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-indigo-600 mb-2">
                                    {subjectCoverage.coverage_percentage}%
                                </div>
                                <p className="text-gray-600 text-sm">
                                    Top {subjectCoverage.top_n} topics cover{" "}
                                    {subjectCoverage.coverage_percentage}% of {exam} - {subject} PYQs
                                </p>
                            </div>

                            <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${subjectCoverage.coverage_percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                />
                            </div>

                            <div className="mt-4">
                                <p className="text-xs text-gray-500 mb-2">Top Topics:</p>
                                <div className="space-y-1">
                                    {subjectCoverage.top_topics.slice(0, 5).map((topic, idx) => (
                                        <div key={idx} className="flex justify-between text-xs">
                                            <span className="text-gray-700">{topic.name}</span>
                                            <span className="text-gray-500">{topic.count} questions</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No coverage data available</p>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

