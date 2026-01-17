// components/conceptmap/TopicList.jsx
import { motion } from "framer-motion";

export default function TopicList({ topics, selectedTopic, onSelectTopic, loading, isCollapsed = false }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                    <p className="text-gray-600 text-xs">Loading...</p>
                </div>
            </div>
        );
    }

    if (!topics || topics.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <p className="text-gray-400 text-center text-xs">
                    {isCollapsed ? "📚" : "No topics available"}
                </p>
            </div>
        );
    }

    if (isCollapsed) {
        return (
            <div className="h-full overflow-y-auto py-2">
                <div className="space-y-2 px-2">
                    {topics.map((topic, index) => (
                        <motion.button
                            key={topic.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onSelectTopic(topic)}
                            className={`w-full aspect-square rounded-lg transition-all duration-200 flex items-center justify-center relative group ${
                                selectedTopic?.id === topic.id
                                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-2 ring-indigo-300"
                                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-indigo-300"
                            }`}
                            title={topic.title}
                        >
                            <span className="text-lg">📄</span>
                            {selectedTopic?.id === topic.id && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full ring-2 ring-white"
                                />
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="space-y-2 px-2 pb-2">
                {topics.map((topic, index) => (
                    <motion.button
                        key={topic.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onSelectTopic(topic)}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 relative overflow-hidden group ${
                            selectedTopic?.id === topic.id
                                ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                                : "bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md"
                        }`}
                    >
                        {/* Gradient overlay on hover for unselected */}
                        {selectedTopic?.id !== topic.id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 to-purple-50/0 group-hover:from-indigo-50/50 group-hover:to-transparent transition-all duration-200" />
                        )}
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-sm line-clamp-1 ${
                                    selectedTopic?.id === topic.id ? "text-white" : "text-gray-800"
                                }`}>
                                    {topic.title}
                                </p>
                            </div>
                        </div>
                        
                        {/* Selection indicator */}
                        {selectedTopic?.id === topic.id && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"
                            />
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

