// components/conceptmap/visuals/MindMapVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MindMapVisual({ topicData }) {
    const [expandedBranch, setExpandedBranch] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No mind map data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const central = data.central || {};
    const branches = data.branches || [];

    const getBranchColor = (depth) => {
        const colors = {
            1: { bg: "from-red-400 to-red-600", border: "border-red-500", text: "text-red-700" },
            2: { bg: "from-blue-400 to-blue-600", border: "border-blue-500", text: "text-blue-700" },
            3: { bg: "from-green-400 to-green-600", border: "border-green-500", text: "text-green-700" },
        };
        return colors[depth] || colors[1];
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600">{topicData.description}</p>
                    )}
                </div>

                {/* Legend */}
                {data.legend && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Depth Levels</h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {data.legend.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div
                                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${
                                            getBranchColor(item.depth).bg
                                        }`}
                                    ></div>
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mind Map Container */}
                <div className="relative max-w-6xl mx-auto">
                    {/* Central Node */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="relative mb-12"
                    >
                        <div className="flex justify-center">
                            <div className="relative">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="px-8 py-6 rounded-2xl shadow-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white cursor-pointer border-4 border-purple-700"
                                    onClick={() => setSelectedNode(selectedNode === "central" ? null : "central")}
                                >
                                    <div className="text-center">
                                        {central.icon && <div className="text-4xl mb-2">{central.icon}</div>}
                                        <h3 className="text-2xl font-bold">{central.label}</h3>
                                        {central.subtitle && (
                                            <p className="text-sm mt-2 opacity-90">{central.subtitle}</p>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Central Node Details */}
                                <AnimatePresence>
                                    {selectedNode === "central" && central.details && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-96 p-4 bg-white rounded-lg shadow-xl border border-gray-200 z-10"
                                        >
                                            <p className="text-sm text-gray-700">{central.details}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>

                    {/* Branches */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {branches.map((branch, branchIdx) => {
                            const colorScheme = getBranchColor(branch.depth || 1);
                            
                            return (
                                <motion.div
                                    key={branch.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: branchIdx * 0.1 }}
                                    className="relative"
                                >
                                    {/* Branch Main Node */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className={`p-5 rounded-xl shadow-lg bg-gradient-to-br ${colorScheme.bg} text-white cursor-pointer border-2 ${colorScheme.border}`}
                                        onClick={() =>
                                            setExpandedBranch(expandedBranch === branch.id ? null : branch.id)
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {branch.icon && <span className="text-2xl">{branch.icon}</span>}
                                                <h4 className="text-lg font-bold">{branch.label}</h4>
                                            </div>
                                            {branch.items && (
                                                <svg
                                                    className={`w-5 h-5 transition-transform flex-shrink-0 ${
                                                        expandedBranch === branch.id ? "rotate-180" : ""
                                                    }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                        {branch.description && (
                                            <p className="text-sm mt-2 opacity-90">{branch.description}</p>
                                        )}
                                    </motion.div>

                                    {/* Branch Items */}
                                    <AnimatePresence>
                                        {(expandedBranch === branch.id || expandedBranch === null) &&
                                            branch.items && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-4 space-y-3"
                                                >
                                                    {branch.items.map((item, itemIdx) => (
                                                        <motion.div
                                                            key={item.id || itemIdx}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: itemIdx * 0.05 }}
                                                            whileHover={{ scale: 1.03 }}
                                                            className={`p-4 bg-white rounded-lg shadow-md border-l-4 ${colorScheme.border} cursor-pointer`}
                                                            onClick={() =>
                                                                setSelectedNode(
                                                                    selectedNode === item.id ? null : item.id
                                                                )
                                                            }
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                {item.icon && (
                                                                    <span className="text-lg">{item.icon}</span>
                                                                )}
                                                                <div className="flex-1">
                                                                    <h5 className={`font-semibold ${colorScheme.text}`}>
                                                                        {item.label}
                                                                    </h5>
                                                                    {item.subtitle && (
                                                                        <p className="text-xs text-gray-600 mt-1">
                                                                            {item.subtitle}
                                                                        </p>
                                                                    )}

                                                                    {/* Item Details */}
                                                                    <AnimatePresence>
                                                                        {selectedNode === item.id && item.details && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                animate={{ opacity: 1, height: "auto" }}
                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                className="mt-2 pt-2 border-t border-gray-200"
                                                                            >
                                                                                {typeof item.details === "string" ? (
                                                                                    <p className="text-sm text-gray-700">
                                                                                        {item.details}
                                                                                    </p>
                                                                                ) : (
                                                                                    <div className="space-y-2">
                                                                                        {item.details.description && (
                                                                                            <p className="text-sm text-gray-700">
                                                                                                {item.details.description}
                                                                                            </p>
                                                                                        )}
                                                                                        {item.details.points && (
                                                                                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                                                                                {item.details.points.map(
                                                                                                    (point, i) => (
                                                                                                        <li key={i}>
                                                                                                            {point}
                                                                                                        </li>
                                                                                                    )
                                                                                                )}
                                                                                            </ul>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </motion.div>
                                            )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary */}
                {data.summary && (
                    <div className="mt-8 max-w-4xl mx-auto p-6 bg-yellow-50 rounded-lg shadow-lg border border-yellow-200">
                        <h3 className="text-lg font-bold text-yellow-800 mb-3">Key Takeaways</h3>
                        {typeof data.summary === "string" ? (
                            <p className="text-gray-700">{data.summary}</p>
                        ) : (
                            <ul className="list-disc list-inside space-y-2 text-gray-700">
                                {data.summary.map((point, idx) => (
                                    <li key={idx}>{point}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

