// components/conceptmap/TopicList.jsx
import { motion } from "framer-motion";

export default function TopicList({ topics, selectedTopic, onSelectTopic, loading }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                    <p className="text-gray-600 text-sm">Loading topics...</p>
                </div>
            </div>
        );
    }

    if (!topics || topics.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <p className="text-gray-500 text-center">No topics available for this subject</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-3">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Topics</h2>
                {topics.map((topic, index) => (
                    <motion.button
                        key={topic.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onSelectTopic(topic)}
                        className={`w-full text-left p-4 rounded-lg transition-all duration-200 border ${
                            selectedTopic?.id === topic.id
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg border-indigo-600"
                                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-indigo-300"
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="font-semibold mb-1">{topic.title}</p>
                                {topic.description && (
                                    <p className={`text-xs ${
                                        selectedTopic?.id === topic.id
                                            ? "text-indigo-100"
                                            : "text-gray-500"
                                    }`}>
                                        {topic.description}
                                    </p>
                                )}
                            </div>
                            <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                                selectedTopic?.id === topic.id
                                    ? "bg-white/20 text-white"
                                    : "bg-gray-100 text-gray-600"
                            }`}>
                                {topic.visualType}
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

