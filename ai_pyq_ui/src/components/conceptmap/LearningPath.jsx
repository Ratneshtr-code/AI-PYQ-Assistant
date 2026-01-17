// components/conceptmap/LearningPath.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildApiUrl } from "../../config/apiConfig";

export default function LearningPath({ subject, onTopicSelect, currentTopicId }) {
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [viewMode, setViewMode] = useState("list"); // list | graph

    useEffect(() => {
        if (!subject) return;

        const fetchRoadmap = async () => {
            setLoading(true);
            setError(null);

            try {
                const url = buildApiUrl(`conceptmap/roadmap/${subject}`);
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        setError("Learning path not available for this subject yet");
                    } else {
                        throw new Error(`Failed to fetch roadmap: ${res.status}`);
                    }
                    setLoading(false);
                    return;
                }

                const data = await res.json();
                setRoadmap(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching roadmap:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchRoadmap();
    }, [subject]);

    const handleSubTopicClick = (subTopic) => {
        onTopicSelect({
            id: subTopic.id,
            title: subTopic.title,
            visualType: subTopic.visualType
        });
    };

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading learning path...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Learning Path Not Available</h3>
                    <p className="text-gray-600">{error}</p>
                    <p className="text-sm text-gray-500 mt-4">
                        The learning path for this subject is being prepared. Please check back later.
                    </p>
                </div>
            </div>
        );
    }

    if (!roadmap) return null;

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                                {roadmap.title}
                            </h1>
                            <p className="text-gray-600 text-lg">{roadmap.description}</p>
                        </div>
                        
                        {/* View Mode Toggle */}
                        <div className="hidden md:flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                            <button
                                onClick={() => setViewMode("list")}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === "list"
                                        ? "bg-purple-500 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                📋 List View
                            </button>
                            <button
                                onClick={() => setViewMode("graph")}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    viewMode === "graph"
                                        ? "bg-purple-500 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                🕸️ Graph View
                            </button>
                        </div>
                    </div>

                    {/* Learning Path Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <div className="text-2xl mb-2">⏱️</div>
                            <div className="text-sm text-gray-600">Estimated Time</div>
                            <div className="text-lg font-bold text-gray-800">{roadmap.learningPath.estimatedTime}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <div className="text-2xl mb-2">📊</div>
                            <div className="text-sm text-gray-600">Difficulty</div>
                            <div className="text-lg font-bold text-gray-800">{roadmap.learningPath.difficulty}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <div className="text-2xl mb-2">🎯</div>
                            <div className="text-sm text-gray-600">Exam Importance</div>
                            <div className="text-lg font-bold text-gray-800">{roadmap.learningPath.examImportance}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                            <div className="text-2xl mb-2">📚</div>
                            <div className="text-sm text-gray-600">Topics</div>
                            <div className="text-lg font-bold text-gray-800">{roadmap.topics.length} Main Topics</div>
                        </div>
                    </div>
                </div>

                {/* Content based on view mode */}
                {viewMode === "list" ? (
                    /* List View */
                    <div className="space-y-6">
                        {roadmap.topics.map((topic, idx) => (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                {/* Topic Header */}
                                <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-lg shadow-md">
                                                    {topic.order}
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-800">{topic.mainTopic}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                                            {topic.category}
                                                        </span>
                                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                                            {topic.importance}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 mb-3">{topic.description}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>⏱️ {topic.estimatedTime}</span>
                                                <span>•</span>
                                                <span>📄 {topic.subTopics.length} Sub-topics</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-topics Grid */}
                                <div className="p-6">
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                                        Study These Topics in Order:
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {topic.subTopics.map((subTopic, subIdx) => {
                                            const isCurrentTopic = currentTopicId === subTopic.id;
                                            
                                            return (
                                                <motion.button
                                                    key={subTopic.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleSubTopicClick(subTopic)}
                                                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                                                        isCurrentTopic
                                                            ? "border-purple-500 bg-purple-50 shadow-md"
                                                            : "border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                                            isCurrentTopic
                                                                ? "bg-purple-500 text-white"
                                                                : "bg-gray-200 text-gray-600"
                                                        }`}>
                                                            {subTopic.order}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h5 className="font-semibold text-gray-800">{subTopic.title}</h5>
                                                                {isCurrentTopic && (
                                                                    <span className="text-purple-500 text-xs">📍 You are here</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-600 mb-2">{subTopic.description}</p>
                                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                                {subTopic.visualType}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* Key Takeaways */}
                                    {topic.keyTakeaways && topic.keyTakeaways.length > 0 && (
                                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <h5 className="text-sm font-semibold text-yellow-800 mb-2">🎯 Key Takeaways:</h5>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-900">
                                                {topic.keyTakeaways.map((takeaway, i) => (
                                                    <li key={i}>{takeaway}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Graph View - Simplified representation */
                    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Topic Network Graph</h3>
                        <div className="text-center text-gray-500 py-12">
                            <div className="text-6xl mb-4">🕸️</div>
                            <p>Interactive network graph visualization coming soon!</p>
                            <p className="text-sm mt-2">For now, use List View to explore the learning path.</p>
                        </div>
                    </div>
                )}

                {/* Study Tips */}
                {roadmap.studyTips && roadmap.studyTips.length > 0 && (
                    <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            💡 Study Tips & Strategy
                        </h3>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {roadmap.studyTips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-700">
                                    <span className="text-purple-500 font-bold">→</span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Exam Strategy */}
                {roadmap.examStrategy && (
                    <div className="mt-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-lg p-6 border border-orange-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            🎯 Exam Strategy
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {roadmap.examStrategy.frequentTopics && (
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">📌 Frequent Topics</h4>
                                    <ul className="space-y-1 text-sm text-gray-700">
                                        {roadmap.examStrategy.frequentTopics.map((topic, idx) => (
                                            <li key={idx} className="flex items-start gap-1">
                                                <span>•</span>
                                                <span>{topic}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {roadmap.examStrategy.mustKnow && (
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">⭐ Must Know</h4>
                                    <ul className="space-y-1 text-sm text-gray-700">
                                        {roadmap.examStrategy.mustKnow.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-1">
                                                <span>•</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {roadmap.examStrategy.connections && (
                                <div>
                                    <h4 className="font-semibold text-gray-800 mb-2">🔗 Key Connections</h4>
                                    <ul className="space-y-1 text-sm text-gray-700">
                                        {roadmap.examStrategy.connections.map((conn, idx) => (
                                            <li key={idx} className="flex items-start gap-1">
                                                <span>•</span>
                                                <span>{conn}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

