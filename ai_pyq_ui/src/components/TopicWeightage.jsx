// src/components/TopicWeightage.jsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

export default function TopicWeightage({ exam, subject, onBack }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [availableSubjects, setAvailableSubjects] = useState([]);

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

    // Fetch topic weightage
    useEffect(() => {
        if (!exam || !subject) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const url = `http://127.0.0.1:8000/dashboard/topic-weightage?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`;
        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.topics && result.topics.length > 0) {
                    setData(result.topics);
                    setTotalQuestions(result.total_questions || 0);
                } else {
                    setData([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching topic weightage:", err);
                setError("Failed to load topic weightage");
                setLoading(false);
            });
    }, [exam, subject]);

    const getColor = (percentage) => {
        if (percentage >= 15) return "#059669"; // Dark green
        if (percentage >= 10) return "#10b981"; // Green
        if (percentage >= 5) return "#34d399"; // Light green
        return "#a7f3d0"; // Very light green
    };

    if (!subject) {
        return null;
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
            >
                <h3 className="text-xl font-semibold mb-4">Topic Weightage</h3>
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
                <h3 className="text-xl font-semibold mb-4 text-red-600">Topic Weightage</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Topic Weightage</h3>
                <p className="text-gray-500 text-center py-8">No topic data available for this subject</p>
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
                <h3 className="text-xl font-semibold text-gray-800 mb-1">Top Topics in {subject}</h3>
                <p className="text-sm text-gray-500">Total Questions: {totalQuestions}</p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject:</label>
                <select
                    value={subject}
                    onChange={(e) => {
                        // Trigger subject change via custom event
                        window.dispatchEvent(new CustomEvent('subjectChange', { detail: e.target.value }));
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-400"
                >
                    {availableSubjects.map((subj) => (
                        <option key={subj} value={subj}>
                            {subj}
                        </option>
                    ))}
                </select>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 'dataMax']} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={190}
                        tick={{ fontSize: 11 }}
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
                    <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={getColor(entry.percentage)}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 text-sm text-gray-600">
                <p className="text-xs text-gray-500">
                    Topics highlighted in darker green have higher weightage (&gt;10%)
                </p>
            </div>
        </motion.div>
    );
}

