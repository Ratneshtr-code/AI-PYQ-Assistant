// src/components/CrossExamHotTopics.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function CrossExamHotTopics({ exams, yearFrom, yearTo }) {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allTopics, setAllTopics] = useState([]);

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
                    // Collect all unique topics
                    const topicsSet = new Set();
                    Object.values(result.exams).forEach((examData) => {
                        examData.topics?.forEach((topic) => {
                            topicsSet.add(topic.name);
                        });
                    });
                    setAllTopics(Array.from(topicsSet).sort());
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
        >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Section C: Hot Topics Across Exams</h3>
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
                        {allTopics.slice(0, 50).map((topic, idx) => {
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
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-medium">{topicInfo.total_count}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {topicInfo.consistency_percentage}%
                                                        </span>
                                                    </div>
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

