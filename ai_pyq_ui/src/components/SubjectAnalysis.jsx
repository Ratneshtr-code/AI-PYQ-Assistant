// src/components/SubjectAnalysis.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import InsightsWindow from "./InsightsWindow";

export default function SubjectAnalysis({ subject, yearFrom, yearTo, examsList }) {
    const [examData, setExamData] = useState([]);
    const [topicData, setTopicData] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [availableExams, setAvailableExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch available exams for this subject
    useEffect(() => {
        if (!subject) return;

        // Get exams that have this subject
        const examPromises = (examsList || []).map((exam) =>
            fetch(
                `http://127.0.0.1:8000/dashboard/subject-weightage?exam=${encodeURIComponent(exam)}&year_from=${yearFrom || ""}&year_to=${yearTo || ""}`
            )
                .then((res) => res.json())
                .then((result) => {
                    const hasSubject = result.subjects?.some((s) => s.name.toLowerCase() === subject.toLowerCase());
                    return hasSubject ? exam : null;
                })
                .catch(() => null)
        );

        Promise.all(examPromises).then((results) => {
            setAvailableExams(results.filter((e) => e !== null));
        });
    }, [subject, yearFrom, yearTo, examsList]);

    // Fetch exam distribution for this subject
    useEffect(() => {
        if (!subject) {
            setExamData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch data for each exam
        const examPromises = (examsList || []).map((exam) =>
            fetch(
                `http://127.0.0.1:8000/dashboard/topic-weightage?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}${yearFrom ? `&year_from=${yearFrom}` : ""}${yearTo ? `&year_to=${yearTo}` : ""}`
            )
                .then((res) => res.json())
                .then((result) => ({
                    exam,
                    count: result.total_questions || 0,
                }))
                .catch(() => ({ exam, count: 0 }))
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
        if (percentage >= 15) return "#059669";
        if (percentage >= 10) return "#10b981";
        if (percentage >= 5) return "#34d399";
        return "#a7f3d0";
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

    return (
        <div className="space-y-6">
            {/* Windows 1 & 2 Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Window 1: Exam Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Exam Distribution</h3>
                        <p className="text-sm text-gray-500">PYQ distribution across exams for {subject}</p>
                    </div>

                    {examData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(300, examData.length * 50)}>
                            <BarChart
                                data={examData}
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
                                    onClick={(entry) => setSelectedExam(entry.name)}
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
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Topic Distribution</h3>
                        <div className="mb-3">
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

