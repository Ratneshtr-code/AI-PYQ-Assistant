// src/components/SubjectWeightage.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { buildApiUrl } from "../config/apiConfig";

export default function SubjectWeightage({ exam, onSubjectSelect, selectedSubject }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalQuestions, setTotalQuestions] = useState(0);

    useEffect(() => {
        if (!exam) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetch(`${buildApiUrl("dashboard/subject-weightage")}?exam=${encodeURIComponent(exam)}`)
            .then((res) => res.json())
            .then((result) => {
                if (result.subjects && result.subjects.length > 0) {
                    setData(result.subjects);
                    setTotalQuestions(result.total_questions || 0);
                } else {
                    setData([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching subject weightage:", err);
                setError("Failed to load subject weightage");
                setLoading(false);
            });
    }, [exam]);

    const getColor = (percentage) => {
        if (percentage >= 20) return "#1e40af"; // Dark blue
        if (percentage >= 15) return "#3b82f6"; // Blue
        if (percentage >= 10) return "#60a5fa"; // Light blue
        if (percentage >= 5) return "#93c5fd"; // Lighter blue
        return "#dbeafe"; // Very light blue
    };

    const handleBarClick = (subject) => {
        if (onSubjectSelect) {
            onSubjectSelect(subject.name);
        }
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
            >
                <h3 className="text-xl font-semibold mb-4">Subject Weightage Heatmap</h3>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Subject Weightage Heatmap</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Subject Weightage Heatmap</h3>
                <p className="text-gray-500 text-center py-8">Please select an exam to view subject weightage</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Subject Weightage Heatmap</h3>
                <p className="text-gray-500 text-center py-8">No data available for this exam</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
        >
            <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-1">Subject Weightage Heatmap</h3>
                <p className="text-sm text-gray-500">Total Questions: {totalQuestions}</p>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 'dataMax']} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        tick={{ fontSize: 12 }}
                        interval={0}
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
                        onClick={(entry) => handleBarClick(entry)}
                    >
                        {data.map((entry, index) => {
                            // Highlight selected subject with a border/outline effect
                            const isSelected = selectedSubject && entry.name === selectedSubject;
                            return (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={getColor(entry.percentage)}
                                    style={{
                                        stroke: isSelected ? "#f59e0b" : "none",
                                        strokeWidth: isSelected ? 3 : 0,
                                        opacity: isSelected ? 1 : 0.9
                                    }}
                                />
                            );
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 text-sm text-gray-600">
                <p className="text-xs text-gray-500">
                    💡 Click on a bar to view topic trend for that subject (shown on the right)
                </p>
                {selectedSubject && (
                    <p className="text-xs text-amber-600 mt-1">
                        ✓ Currently viewing: <strong>{selectedSubject}</strong>
                    </p>
                )}
            </div>
        </motion.div>
    );
}

