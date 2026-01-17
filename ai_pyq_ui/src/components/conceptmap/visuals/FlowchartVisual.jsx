// components/conceptmap/visuals/FlowchartVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FlowchartVisual({ topicData }) {
    const [selectedNode, setSelectedNode] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null);

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No flowchart data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const categories = data.categories || [];
    const connections = data.connections || [];

    const getCategoryColor = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.color || "#6B7280";
    };

    const getNodeColor = (type) => {
        const colors = {
            cause: "from-red-400 to-red-600",
            effect: "from-green-400 to-green-600",
            intermediate: "from-blue-400 to-blue-600",
            event: "from-purple-400 to-purple-600",
        };
        return colors[type] || "from-gray-400 to-gray-600";
    };

    const getBorderColor = (type) => {
        const colors = {
            cause: "border-red-600",
            effect: "border-green-600",
            intermediate: "border-blue-600",
            event: "border-purple-600",
        };
        return colors[type] || "border-gray-600";
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600">{topicData.description}</p>
                    )}
                </div>

                {/* Legend */}
                {data.legend && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
                        <div className="flex flex-wrap gap-4">
                            {data.legend.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded ${getNodeColor(item.type)} bg-gradient-to-br`}></div>
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Flowchart by Categories */}
                <div className="space-y-8">
                    {categories.map((category, catIdx) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: catIdx * 0.1 }}
                            className="bg-white rounded-lg shadow-lg border-2 overflow-hidden"
                            style={{ borderColor: category.color }}
                        >
                            {/* Category Header */}
                            <div
                                className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: category.color + "20" }}
                                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {category.icon && <span className="text-2xl">{category.icon}</span>}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">{category.label}</h3>
                                            {category.description && (
                                                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{category.items?.length || 0} items</span>
                                        <svg
                                            className={`w-5 h-5 text-gray-600 transition-transform ${
                                                expandedCategory === category.id ? "rotate-180" : ""
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Category Items */}
                            <AnimatePresence>
                                {(expandedCategory === category.id || expandedCategory === null) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-6"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {category.items?.map((item, idx) => (
                                                <motion.div
                                                    key={item.id || idx}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    whileHover={{ scale: 1.05 }}
                                                    className={`relative p-4 rounded-lg shadow-md cursor-pointer border-2 ${getBorderColor(
                                                        item.type || "intermediate"
                                                    )}`}
                                                    onClick={() => setSelectedNode(selectedNode === item.id ? null : item.id)}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}05 100%)`,
                                                    }}
                                                >
                                                    {/* Node Type Badge */}
                                                    {item.type && (
                                                        <div
                                                            className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getNodeColor(
                                                                item.type
                                                            )} shadow-md`}
                                                        >
                                                            {item.type}
                                                        </div>
                                                    )}

                                                    {/* Item Content */}
                                                    <div className="flex items-start gap-2">
                                                        {item.icon && <span className="text-xl">{item.icon}</span>}
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-800 text-sm leading-tight">
                                                                {item.label || item}
                                                            </h4>
                                                            {item.subtitle && (
                                                                <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    <AnimatePresence>
                                                        {selectedNode === item.id && item.details && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-3 pt-3 border-t border-gray-300"
                                                            >
                                                                {typeof item.details === "string" ? (
                                                                    <p className="text-xs text-gray-700">{item.details}</p>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {item.details.description && (
                                                                            <p className="text-xs text-gray-700">
                                                                                {item.details.description}
                                                                            </p>
                                                                        )}
                                                                        {item.details.points && (
                                                                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                                                                                {item.details.points.map((point, i) => (
                                                                                    <li key={i}>{point}</li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Sub-categories if exist */}
                                        {category.subcategories && (
                                            <div className="mt-6 space-y-4">
                                                {category.subcategories.map((subcat, subIdx) => (
                                                    <div key={subIdx} className="pl-4 border-l-4" style={{ borderColor: category.color }}>
                                                        <h4 className="font-semibold text-gray-700 mb-2">{subcat.label}</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {subcat.items?.map((item, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700"
                                                                >
                                                                    {item}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>

                {/* Connections/Relationships */}
                {connections && connections.length > 0 && (
                    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Key Relationships</h3>
                        <div className="space-y-3">
                            {connections.map((conn, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <span className="font-semibold text-gray-700">{conn.from}</span>
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span className="text-sm text-gray-600 italic">{conn.relationship}</span>
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span className="font-semibold text-gray-700">{conn.to}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

