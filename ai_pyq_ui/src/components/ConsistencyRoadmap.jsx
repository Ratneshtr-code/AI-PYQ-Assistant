// src/components/ConsistencyRoadmap.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function ConsistencyRoadmap({ exam }) {
    const [roadmapData, setRoadmapData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!exam) {
            setRoadmapData(null);
            return;
        }

        const fetchRoadmap = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `http://127.0.0.1:8000/roadmap/consistency?exam=${encodeURIComponent(exam)}`
                );
                const data = await res.json();
                
                if (data.error) {
                    setError(data.error);
                    setRoadmapData(null);
                } else {
                    setRoadmapData(data);
                    setError(null);
                }
            } catch (err) {
                setError("Failed to load consistency roadmap. Please try again.");
                setRoadmapData(null);
                console.error("Consistency roadmap fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoadmap();
    }, [exam]);

    const getConsistencyColor = (score) => {
        if (score >= 0.7) return "bg-emerald-500";
        if (score >= 0.4) return "bg-blue-500";
        if (score >= 0.2) return "bg-yellow-500";
        return "bg-gray-400";
    };

    const getStabilityRating = (rating) => {
        const colors = {
            "High": "bg-emerald-100 text-emerald-700 border-emerald-300",
            "Medium": "bg-blue-100 text-blue-700 border-blue-300",
            "Low": "bg-yellow-100 text-yellow-700 border-yellow-300"
        };
        return colors[rating] || "bg-gray-100 text-gray-700 border-gray-300";
    };

    const handleTopicClick = (e, subjectName, topicName) => {
        e.stopPropagation();
        navigate(`/topic-wise-pyq?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subjectName)}&topic=${encodeURIComponent(topicName)}&from=ai-roadmap`);
    };

    if (!exam) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
                <div className="text-5xl mb-3">📈</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    Select an Exam to Generate Consistency Roadmap
                </h3>
                <p className="text-sm text-gray-600">
                    Choose an exam to see topics based on consistency across years
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-600 text-sm">Generating consistency roadmap...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"
            >
                <p className="text-red-700 text-sm font-medium">{error}</p>
            </motion.div>
        );
    }

    if (!roadmapData) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
        >
            {/* Compact Subjects Roadmap */}
            <div className="space-y-3">
                {roadmapData.subjects.map((subject, subjectIdx) => {
                    return (
                        <motion.div
                            key={subjectIdx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: subjectIdx * 0.05 }}
                        >
                            {/* Compact Subject Card */}
                            <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-blue-200 transition-all">
                                {/* Compact Subject Header */}
                                <div className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center text-white font-bold text-sm ${getConsistencyColor(subject.consistency_score)}`}>
                                                {subjectIdx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-800 truncate">
                                                    {subject.name}
                                                </h3>
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                    {subject.question_count} questions
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-gray-800">
                                                    {Math.round(subject.consistency_score * 100)}%
                                                </div>
                                                <div className="text-xs text-gray-500">Consistency</div>
                                            </div>
                                            <div
                                                className={`w-3 h-3 rounded-full ${getConsistencyColor(subject.consistency_score)}`}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compact Topics List */}
                                {subject.topics && subject.topics.length > 0 && (
                                    <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                                        <div className="flex flex-wrap gap-2">
                                            {subject.topics.slice(0, 6).map((topic, topicIdx) => (
                                                <div
                                                    key={topicIdx}
                                                    onClick={(e) => handleTopicClick(e, subject.name, topic.name)}
                                                    className="bg-gray-50 rounded-md px-2 py-1 border border-gray-200 text-xs cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-700 font-medium group-hover:text-blue-700">
                                                            {topic.name.length > 40 
                                                                ? topic.name.substring(0, 40) + '...' 
                                                                : topic.name}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 text-xs font-bold text-white rounded ${getConsistencyColor(
                                                            topic.consistency_score
                                                        )}`}>
                                                            {Math.round(topic.consistency_score * 100)}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${getStabilityRating(topic.stability_rating)}`}>
                                                            {topic.stability_rating}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {topic.years_appeared}/{topic.total_years} years
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {subject.topics.length > 6 && (
                                                <div className="bg-gray-100 rounded-md px-2 py-1 text-xs text-gray-600">
                                                    +{subject.topics.length - 6} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Arrow Connector */}
                            {subjectIdx < roadmapData.subjects.length - 1 && (
                                <div className="flex justify-center py-3">
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: subjectIdx * 0.05 + 0.2 }}
                                        className="relative"
                                    >
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            className="text-blue-400 drop-shadow-sm"
                                        >
                                            <path
                                                d="M12 4L12 20M12 20L6 14M12 20L18 14"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </motion.div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}

