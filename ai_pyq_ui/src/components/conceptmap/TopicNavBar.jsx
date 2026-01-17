// components/conceptmap/TopicNavBar.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TopicNavBar({ 
    activeTab, 
    onTabChange, 
    onLearningPathClick, 
    showLearningPath = true,
    currentTopic 
}) {
    const [showTooltip, setShowTooltip] = useState(null);

    const tabs = [
        { 
            id: "learning-path", 
            label: "Learning Path", 
            icon: "🗺️", 
            available: showLearningPath,
            description: "View complete study roadmap" 
        },
        { 
            id: "content", 
            label: "Content", 
            icon: "📚", 
            available: true,
            description: "Interactive visual content" 
        },
        { 
            id: "summary", 
            label: "Summary", 
            icon: "📝", 
            available: false,
            description: "Quick revision notes (Coming Soon)" 
        },
        { 
            id: "quiz", 
            label: "Quiz", 
            icon: "🎯", 
            available: false,
            description: "Test your knowledge (Coming Soon)" 
        }
    ];

    const handleTabClick = (tab) => {
        if (!tab.available) {
            return;
        }
        
        if (tab.id === "learning-path") {
            onLearningPathClick();
        } else {
            onTabChange(tab.id);
        }
    };

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
            <div className="max-w-full px-4 md:px-6">
                <div className="flex items-center justify-between py-3">
                    {/* Topic Title (Mobile) */}
                    {currentTopic && (
                        <div className="flex-1 md:hidden mr-3">
                            <h2 className="text-sm font-semibold text-gray-800 truncate">
                                {currentTopic.title}
                            </h2>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 md:gap-2 ml-auto">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const isLearningPath = tab.id === "learning-path";
                            
                            return (
                                <div
                                    key={tab.id}
                                    className="relative"
                                    onMouseEnter={() => setShowTooltip(tab.id)}
                                    onMouseLeave={() => setShowTooltip(null)}
                                >
                                    <motion.button
                                        whileHover={tab.available ? { scale: 1.05 } : {}}
                                        whileTap={tab.available ? { scale: 0.95 } : {}}
                                        onClick={() => handleTabClick(tab)}
                                        disabled={!tab.available}
                                        className={`
                                            flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm
                                            transition-all duration-200
                                            ${isActive && tab.available
                                                ? isLearningPath
                                                    ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                                                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                                                : tab.available
                                                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    : "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
                                            }
                                        `}
                                    >
                                        <span className="text-base md:text-lg">{tab.icon}</span>
                                        <span className="hidden md:inline">{tab.label}</span>
                                        {!tab.available && (
                                            <span className="hidden md:inline text-xs ml-1 opacity-75">Soon</span>
                                        )}
                                    </motion.button>

                                    {/* Tooltip */}
                                    <AnimatePresence>
                                        {showTooltip === tab.id && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
                                                    bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg
                                                    whitespace-nowrap z-50 pointer-events-none"
                                            >
                                                {tab.description}
                                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 
                                                    w-2 h-2 bg-gray-900 rotate-45">
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

