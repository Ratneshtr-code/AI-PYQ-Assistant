// src/components/TopicTrend.jsx
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { buildApiUrl } from "../config/apiConfig";

export default function TopicTrend({ exam, subject, topic }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    // Fetch available subjects
    useEffect(() => {
        if (!exam) return;

        fetch(`${buildApiUrl("dashboard/filters")}?exam=${encodeURIComponent(exam)}`)
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

    // Fetch trend data
    useEffect(() => {
        if (!exam) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let url = `${buildApiUrl("dashboard/topic-trend")}?exam=${encodeURIComponent(exam)}`;
        if (subject) {
            url += `&subject=${encodeURIComponent(subject)}`;
        }
        if (topic) {
            url += `&topic=${encodeURIComponent(topic)}`;
        }

        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.trend && result.trend.length > 0) {
                    setData(result.trend);
                    setSummary(result.summary || null);
                } else {
                    setData([]);
                    setSummary(null);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching topic trend:", err);
                setError("Failed to load topic trend");
                setLoading(false);
            });
    }, [exam, subject, topic]);

    const getTrendIcon = (direction) => {
        switch (direction) {
            case "increasing":
                return "📈";
            case "decreasing":
                return "📉";
            default:
                return "➡️";
        }
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
            >
                <h3 className="text-xl font-semibold mb-4">Topic Trend</h3>
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </motion.div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Topic Trend</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Topic Trend (2010-2023)</h3>
                <p className="text-gray-500 text-center py-8">Please select an exam to view trends</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Topic Trend</h3>
                <p className="text-gray-500 text-center py-8">No trend data available</p>
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
                <h3 className="text-xl font-semibold text-gray-800 mb-1">Topic Trend</h3>
                <p className="text-sm text-gray-500">
                    {subject ? (
                        <>Year-by-year trend for <strong>{subject}</strong></>
                    ) : (
                        "All Subjects (select a subject from the left to see its trend)"
                    )}
                    {topic && ` • Topic: ${topic}`}
                </p>
            </div>

            {availableSubjects.length > 0 && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Subject:</label>
                    <select
                        value={subject || ""}
                        onChange={(e) => {
                            window.dispatchEvent(
                                new CustomEvent("subjectChange", { detail: e.target.value || null })
                            );
                        }}
                        className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">All Subjects</option>
                        {availableSubjects.map((subj) => (
                            <option key={subj} value={subj}>
                                {subj}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip
                        formatter={(value, name) => {
                            if (name === "count") {
                                return [value, "Questions"];
                            }
                            if (name === "percentage") {
                                return [`${value}%`, "Percentage"];
                            }
                            return [value, name];
                        }}
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            {summary && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
                >
                    <h4 className="font-semibold text-gray-800 mb-2">Trend Summary:</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                        <li>
                            <strong>Peak Year:</strong> {summary.peak_year} ({data.find((d) => d.year === summary.peak_year)?.count || 0} questions)
                        </li>
                        <li>
                            <strong>Trend Direction:</strong> {getTrendIcon(summary.trend_direction)}{" "}
                            {summary.trend_direction.charAt(0).toUpperCase() + summary.trend_direction.slice(1)}
                        </li>
                        <li>
                            <strong>Average Frequency:</strong> {summary.average_frequency?.toFixed(1) || "N/A"} questions/year
                        </li>
                    </ul>
                    <p className="mt-2 text-xs text-gray-600 italic">
                        This gives "what was hot each year."
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
}

