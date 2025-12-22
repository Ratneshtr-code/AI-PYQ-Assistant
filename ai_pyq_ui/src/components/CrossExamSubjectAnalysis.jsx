// src/components/CrossExamSubjectAnalysis.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { motion } from "framer-motion";

export default function CrossExamSubjectAnalysis({ exams, yearFrom, yearTo, selectedSubject, onSubjectSelect }) {
    const [subjectData, setSubjectData] = useState({});
    const [topicData, setTopicData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        let url = `http://127.0.0.1:8000/dashboard/cross-exam/subject-distribution?exams=${encodeURIComponent(examsStr)}`;
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
    }, [exams, yearFrom, yearTo]);

    // Fetch topic distribution for selected subject
    useEffect(() => {
        if (!exams || exams.length === 0 || !selectedSubject) {
            setTopicData({});
            return;
        }

        const examsStr = exams.join(",");
        let url = `http://127.0.0.1:8000/dashboard/cross-exam/topic-distribution?exams=${encodeURIComponent(examsStr)}&subject=${encodeURIComponent(selectedSubject)}`;
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
    }, [exams, selectedSubject, yearFrom, yearTo]);

    const getExamColor = (index) => {
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
        return colors[index % colors.length];
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
            exams.forEach((exam, idx) => {
                const examData = subjectData[exam];
                const subj = examData?.subjects?.find((s) => s.name === subject);
                dataPoint[exam] = subj?.count || 0;
            });
            return dataPoint;
        });

        return chartData.sort((a, b) => {
            const totalA = exams.reduce((sum, exam) => sum + (a[exam] || 0), 0);
            const totalB = exams.reduce((sum, exam) => sum + (b[exam] || 0), 0);
            return totalB - totalA;
        });
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
            exams.forEach((exam) => {
                const examData = topicData[exam];
                const top = examData?.topics?.find((t) => t.name === topic);
                dataPoint[exam] = top?.count || 0;
            });
            return dataPoint;
        });

        return chartData.sort((a, b) => {
            const totalA = exams.reduce((sum, exam) => sum + (a[exam] || 0), 0);
            const totalB = exams.reduce((sum, exam) => sum + (b[exam] || 0), 0);
            return totalB - totalA;
        });
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
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">Section A: Subject Distribution</h3>
                        <p className="text-sm text-gray-500">Click a subject to view its topics</p>
                    </div>
                    {subjectChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(400, subjectChartData.length * 40)}>
                            <BarChart
                                data={subjectChartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                                {exams.map((exam, idx) => (
                                    <Bar
                                        key={exam}
                                        dataKey={exam}
                                        fill={getExamColor(idx)}
                                        radius={[4, 4, 0, 0]}
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
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
                >
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">
                            Section B: Topic Distribution
                        </h3>
                        <p className="text-sm text-gray-500">
                            {selectedSubject ? `Topics for ${selectedSubject}` : "Select a subject from the left chart"}
                        </p>
                    </div>
                    {selectedSubject ? (
                        topicChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={Math.max(400, topicChartData.length * 40)}>
                                <BarChart
                                    data={topicChartData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        height={100}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Legend />
                                    {exams.map((exam, idx) => (
                                        <Bar
                                            key={exam}
                                            dataKey={exam}
                                            fill={getExamColor(idx)}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
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

