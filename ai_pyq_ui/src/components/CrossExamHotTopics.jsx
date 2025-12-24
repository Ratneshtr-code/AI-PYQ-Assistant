// src/components/CrossExamHotTopics.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function CrossExamHotTopics({ exams, yearFrom, yearTo }) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allTopics, setAllTopics] = useState([]);
    const [topN, setTopN] = useState(10); // Default to Top 10

    useEffect(() => {
        if (!exams || exams.length === 0) {
            setData({});
            setAllTopics([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const examsStr = exams.join(",");
        let url = `http://127.0.0.1:8000/dashboard/cross-exam/hot-topics?exams=${encodeURIComponent(examsStr)}`;
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
                    setData(result.exams);
                    // Collect all unique topics with their totals
                    const topicMap = new Map();
                    Object.values(result.exams).forEach((examData) => {
                        examData.topics?.forEach((topic) => {
                            const existing = topicMap.get(topic.name);
                            if (existing) {
                                existing.total_count += topic.total_count || 0;
                            } else {
                                topicMap.set(topic.name, {
                                    name: topic.name,
                                    total_count: topic.total_count || 0,
                                });
                            }
                        });
                    });
                    // Sort by total_count descending
                    const sortedTopics = Array.from(topicMap.values())
                        .sort((a, b) => b.total_count - a.total_count)
                        .map(t => t.name);
                    setAllTopics(sortedTopics);
                } else {
                    setData({});
                    setAllTopics([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching cross-exam hot topics:", err);
                setError("Failed to load hot topics");
                setLoading(false);
            });
    }, [exams, yearFrom, yearTo]);

    const getTopicData = (topicName) => {
        const topicInfo = {};
        exams.forEach((exam) => {
            const examData = data[exam];
            const topic = examData?.topics?.find((t) => t.name === topicName);
            topicInfo[exam] = topic || null;
        });
        return topicInfo;
    };

    const getExamColor = (index) => {
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Hot Topics Across Exams</h3>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
                <h3 className="text-xl font-semibold mb-4 text-red-600">Hot Topics Across Exams</h3>
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (allTopics.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Hot Topics Across Exams</h3>
                <p className="text-gray-500 text-center py-8">No hot topics available for selected exams</p>
            </div>
        );
    }

    // Filter topics based on topN selection
    const filteredTopics = allTopics.slice(0, topN);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
        >
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Show:</label>
                    <select
                        value={topN}
                        onChange={(e) => setTopN(parseInt(e.target.value))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    >
                        <option value={5}>Top 5 Hottest Topics</option>
                        <option value={10}>Top 10 Hottest Topics</option>
                        <option value={20}>Top 20 Hottest Topics</option>
                        <option value={50}>Top 50 Hottest Topics</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Topic</th>
                            {exams.map((exam, idx) => (
                                <th
                                    key={exam}
                                    className="text-center py-3 px-4 font-semibold text-gray-700"
                                    style={{ color: getExamColor(idx) }}
                                >
                                    {exam}
                                </th>
                            ))}
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTopics.map((topic, idx) => {
                            const topicData = getTopicData(topic);
                            const totalCount = exams.reduce(
                                (sum, exam) => sum + (topicData[exam]?.total_count || 0),
                                0
                            );
                            const appearsInExams = exams.filter((exam) => topicData[exam] !== null).length;
                            const isHotInMultiple = appearsInExams >= 2;

                            return (
                                <motion.tr
                                    key={topic}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                                        isHotInMultiple ? "bg-yellow-50" : ""
                                    }`}
                                >
                                    <td className="py-3 px-4 font-medium">
                                        {isHotInMultiple && <span className="text-yellow-600 mr-2">🔥</span>}
                                        {topic}
                                    </td>
                                    {exams.map((exam, examIdx) => {
                                        const topicInfo = topicData[exam];
                                        return (
                                            <td key={exam} className="py-3 px-4 text-center">
                                                {topicInfo ? (
                                                    <span className="font-medium">{topicInfo.total_count}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="py-3 px-4 text-center font-semibold">{totalCount}</td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600">
                    <strong>💡 Insight:</strong> Topics highlighted in yellow appear in multiple exams — these are
                    high-value study areas.
                </p>
            </div>
        </motion.div>
    );
}

