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
    const central = data.root || data.central || {};
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
                                    {selectedNode === "central" && central.info && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-96 p-4 bg-white rounded-lg shadow-xl border border-gray-200 z-10"
                                        >
                                            {typeof central.info === 'string' ? (
                                                <p className="text-sm text-gray-700">{central.info}</p>
                                            ) : (
                                                <div className="space-y-2 text-sm text-gray-700">
                                                    {central.info.description && (
                                                        <p><strong>Description:</strong> {central.info.description}</p>
                                                    )}
                                                    {central.info.period && (
                                                        <p><strong>Period:</strong> {central.info.period}</p>
                                                    )}
                                                    {central.info.trigger && (
                                                        <p><strong>Trigger:</strong> {central.info.trigger}</p>
                                                    )}
                                                    {central.info.significance && (
                                                        <p><strong>Significance:</strong> {central.info.significance}</p>
                                                    )}
                                                </div>
                                            )}
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
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {branch.icon && <span className="text-2xl">{branch.icon}</span>}
                                                    <h4 className="text-lg font-bold">{branch.label}</h4>
                                                </div>
                                                {branch.subtitle && (
                                                    <p className="text-sm mt-1 opacity-90">{branch.subtitle}</p>
                                                )}
                                                {branch.info && branch.info.description && (
                                                    <p className="text-xs mt-2 opacity-80">{branch.info.description}</p>
                                                )}
                                            </div>
                                            {branch.leaves && (
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
                                            {/* Support old format with items */}
                                            {!branch.leaves && branch.items && (
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
                                    </motion.div>

                                    {/* Branch Leaves (new format) or Items (old format) */}
                                    <AnimatePresence>
                                        {(expandedBranch === branch.id || expandedBranch === null) &&
                                            (branch.leaves || branch.items) && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-4 space-y-3"
                                                >
                                                    {(branch.leaves || branch.items).map((leaf, leafIdx) => {
                                                        // Support both 'info' (new format) and 'details' (old format)
                                                        const leafInfo = leaf.info || leaf.details;
                                                        
                                                        return (
                                                        <motion.div
                                                            key={leaf.id || leafIdx}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: leafIdx * 0.05 }}
                                                            whileHover={{ scale: 1.03 }}
                                                            className={`p-4 bg-white rounded-lg shadow-md border-l-4 ${colorScheme.border} cursor-pointer`}
                                                            onClick={() =>
                                                                setSelectedNode(
                                                                    selectedNode === leaf.id ? null : leaf.id
                                                                )
                                                            }
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                {leaf.icon && (
                                                                    <span className="text-lg">{leaf.icon}</span>
                                                                )}
                                                                <div className="flex-1">
                                                                    <h5 className={`font-semibold ${colorScheme.text}`}>
                                                                        {leaf.label}
                                                                    </h5>
                                                                    {leaf.subtitle && (
                                                                        <p className="text-xs text-gray-600 mt-1">
                                                                            {leaf.subtitle}
                                                                        </p>
                                                                    )}

                                                                    {/* Leaf Info/Details */}
                                                                    <AnimatePresence>
                                                                        {selectedNode === leaf.id && leafInfo && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                animate={{ opacity: 1, height: "auto" }}
                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                className="mt-3 pt-3 border-t border-gray-200"
                                                                            >
                                                                                {typeof leafInfo === "string" ? (
                                                                                    <p className="text-sm text-gray-700">
                                                                                        {leafInfo}
                                                                                    </p>
                                                                                ) : (
                                                                                    <div className="space-y-2">
                                                                                        {/* Render all info/details fields dynamically */}
                                                                                        {Object.entries(leafInfo).map(([key, value]) => {
                                                                                            if (value === null || value === undefined) return null;
                                                                                            
                                                                                            // Skip already displayed fields
                                                                                            if (key === 'label' || key === 'subtitle') return null;
                                                                                            
                                                                                            const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                                                                                            
                                                                                            if (typeof value === 'string') {
                                                                                                return (
                                                                                                    <div key={key} className="text-sm">
                                                                                                        <strong className="text-gray-800">{label}:</strong>
                                                                                                        <span className="text-gray-700 ml-1">{value}</span>
                                                                                                    </div>
                                                                                                );
                                                                                            } else if (Array.isArray(value)) {
                                                                                                return (
                                                                                                    <div key={key} className="text-sm">
                                                                                                        <strong className="text-gray-800 block mb-1">{label}:</strong>
                                                                                                        <ul className="list-disc list-inside space-y-0.5 text-gray-700 ml-2">
                                                                                                            {value.map((item, i) => (
                                                                                                                <li key={i}>{item}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                );
                                                                                            } else if (typeof value === 'object') {
                                                                                                return (
                                                                                                    <div key={key} className="text-sm">
                                                                                                        <strong className="text-gray-800 block mb-1">{label}:</strong>
                                                                                                        <div className="ml-2 space-y-1">
                                                                                                            {Object.entries(value).map(([subKey, subValue]) => (
                                                                                                                <div key={subKey}>
                                                                                                                    <span className="text-gray-700 font-medium">
                                                                                                                        {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                                                    </span>
                                                                                                                    {Array.isArray(subValue) ? (
                                                                                                                        <ul className="list-disc list-inside ml-2 text-gray-600">
                                                                                                                            {subValue.map((item, idx) => (
                                                                                                                                <li key={idx}>{item}</li>
                                                                                                                            ))}
                                                                                                                        </ul>
                                                                                                                    ) : (
                                                                                                                        <span className="text-gray-600 ml-1">{subValue}</span>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return null;
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                        );
                                                    })}
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

