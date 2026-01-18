// components/conceptmap/visuals/TabsVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TabsVisual({ topicData }) {
    const { data } = topicData || {};
    const { tabs } = data || {};
    
    const [activeTabId, setActiveTabId] = useState(tabs?.[0]?.id);
    
    // Safety checks AFTER hooks
    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No topic data available</p>
            </div>
        );
    }
    
    if (!tabs || tabs.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No tabs data available</p>
            </div>
        );
    }
    
    const activeTab = tabs.find(t => t.id === activeTabId);
    
    // Parse markdown bold text
    const parseMarkdown = (text) => {
        if (!text) return text;
        return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };
    
    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        {topicData.title}
                    </h1>
                    {topicData.description && (
                        <p className="text-gray-600 text-lg max-w-4xl mx-auto">
                            {topicData.description}
                        </p>
                    )}
                </motion.div>
                
                {/* Tabs Navigation */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`
                                px-6 py-3 rounded-lg font-semibold text-sm md:text-base
                                transition-all duration-300 relative overflow-hidden
                                ${activeTabId === tab.id
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }
                            `}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {tab.label}
                            {activeTabId === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 -z-10"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    ))}
                </div>
                
                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab && (
                        <motion.div
                            key={activeTab.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-xl shadow-xl p-6 md:p-8"
                        >
                            {/* Tab Title */}
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-blue-500">
                                {activeTab.title}
                            </h2>
                            
                            {/* Sections */}
                            <div className="space-y-8">
                                {activeTab.sections.map((section, sectionIndex) => (
                                    <motion.div
                                        key={sectionIndex}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: sectionIndex * 0.1 }}
                                        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-5 md:p-6 border border-blue-100"
                                    >
                                        {/* Section Heading */}
                                        <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-4 flex items-center">
                                            <span className="w-2 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full mr-3"></span>
                                            {section.heading}
                                        </h3>
                                        
                                        {/* Comparison Grid (if present) */}
                                        {section.comparisonGrid ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {section.comparisonGrid.map((item, itemIndex) => (
                                                    <motion.div
                                                        key={itemIndex}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                                                        className="bg-white rounded-lg p-4 shadow-md border-2 border-blue-200 hover:border-purple-400 transition-all"
                                                    >
                                                        <h4 className="text-lg font-bold text-purple-700 mb-3 pb-2 border-b border-purple-200">
                                                            {item.body}
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {item.points.map((point, pointIndex) => (
                                                                <li
                                                                    key={pointIndex}
                                                                    className="flex items-start text-gray-700 text-sm leading-relaxed"
                                                                >
                                                                    <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                                                    <span className="flex-1">
                                                                        {parseMarkdown(point)}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : section.points ? (
                                            /* Section Points (regular list) */
                                            <ul className="space-y-3">
                                                {section.points.map((point, pointIndex) => (
                                                    <motion.li
                                                        key={pointIndex}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: (sectionIndex * 0.1) + (pointIndex * 0.05) }}
                                                        className="flex items-start text-gray-800 leading-relaxed"
                                                    >
                                                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                                        <span className="flex-1 text-base md:text-lg">
                                                            {parseMarkdown(point)}
                                                        </span>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        ) : (
                                            /* No content */
                                            <p className="text-gray-500 italic">No content available for this section.</p>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                            
                            {/* Summary */}
                            {activeTab.summary && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-5 md:p-6 border-2 border-yellow-300"
                                >
                                    <h3 className="text-xl md:text-2xl font-bold text-orange-900 mb-3 flex items-center">
                                        <span className="text-2xl mr-2">📝</span>
                                        Summary
                                    </h3>
                                    <p className="text-gray-800 leading-relaxed text-base md:text-lg">
                                        {parseMarkdown(activeTab.summary)}
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Overall Summary at Bottom */}
                {data.summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl shadow-lg p-6 md:p-8 border-2 border-green-300"
                    >
                        <h3 className="text-2xl md:text-3xl font-bold text-green-900 mb-4 flex items-center">
                            <span className="text-3xl mr-3">🎯</span>
                            Complete Summary
                        </h3>
                        <p className="text-gray-800 leading-relaxed text-base md:text-lg">
                            {parseMarkdown(data.summary)}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

