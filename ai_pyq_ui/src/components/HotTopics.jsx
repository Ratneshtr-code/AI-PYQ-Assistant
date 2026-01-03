// src/components/HotTopics.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { buildApiUrl } from "../config/apiConfig";

export default function HotTopics({ exam, minConsistency = 0 }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: "consistency_percentage", direction: "desc" });

    useEffect(() => {
        if (!exam) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const url = `${buildApiUrl("dashboard/hot-topics")}?exam=${encodeURIComponent(exam)}&min_years=1`;
        fetch(url)
            .then((res) => res.json())
            .then((result) => {
                if (result.topics && result.topics.length > 0) {
                    // Filter by min consistency
                    const filtered = result.topics.filter(
                        (topic) => topic.consistency_percentage >= minConsistency
                    );
                    setData(filtered);
                } else {
                    setData([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching hot topics:", err);
                setError("Failed to load hot topics");
                setLoading(false);
            });
    }, [exam, minConsistency]);

    const handleSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                };
            }
            return { key, direction: "desc" };
        });
    };

    const sortedData = [...data].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        const multiplier = sortConfig.direction === "asc" ? 1 : -1;
        return (aVal > bVal ? 1 : -1) * multiplier;
    });

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
            >
                <h3 className="text-xl font-semibold mb-4">Hot Topics</h3>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Hot Topics</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Hot Topics (Frequent Every Year)</h3>
                <p className="text-gray-500 text-center py-8">Please select an exam to view hot topics</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Hot Topics (Frequent Every Year)</h3>
                <p className="text-gray-500 text-center py-8">No hot topics found for this exam</p>
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
                <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    Hot Topics (Frequent Every Year)
                </h3>
                <p className="text-sm text-gray-500">
                    HOT TOPICS IN {exam.toUpperCase()} (Consistently Asked)
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("name")}
                            >
                                Topic
                                {sortConfig.key === "name" && (
                                    <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                )}
                            </th>
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("years_appeared")}
                            >
                                Years Appeared
                                {sortConfig.key === "years_appeared" && (
                                    <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                )}
                            </th>
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("consistency_percentage")}
                            >
                                Consistency
                                {sortConfig.key === "consistency_percentage" && (
                                    <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                )}
                            </th>
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort("total_count")}
                            >
                                Total Count
                                {sortConfig.key === "total_count" && (
                                    <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((topic, index) => {
                            const isHot = topic.consistency_percentage >= 70;
                            return (
                                <motion.tr
                                    key={topic.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                                        isHot ? "bg-red-50" : ""
                                    }`}
                                >
                                    <td className="py-3 px-4 font-medium">
                                        {isHot ? (
                                            <span className="text-red-600">{topic.name}</span>
                                        ) : (
                                            topic.name
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {topic.years_appeared} / {topic.total_years}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        isHot ? "bg-red-500" : "bg-blue-500"
                                                    }`}
                                                    style={{ width: `${topic.consistency_percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium w-12 text-right">
                                                {topic.consistency_percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">{topic.total_count}</td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                <p className="text-sm text-gray-700">
                    <strong>Insight:</strong> These topics appear almost every year — do NOT skip these.
                </p>
            </div>
        </motion.div>
    );
}

