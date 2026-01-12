// components/conceptmap/visuals/LayeredSystemVisual.jsx
import { useState } from "react";
import { motion } from "framer-motion";

export default function LayeredSystemVisual({ topicData, onLayerClick }) {
    const { layers = [] } = topicData || {};
    const [hoveredLayer, setHoveredLayer] = useState(null);

    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    const handleLayerClick = (layer) => {
        if (onLayerClick) {
            onLayerClick({
                title: layer.label,
                description: layer.info?.description || "",
                info: layer.info,
            });
        }
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-gray-200 p-8">
            <div className="h-full flex flex-col justify-center space-y-4">
                {sortedLayers.map((layer, index) => (
                    <motion.div
                        key={layer.id}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative rounded-lg shadow-lg border-2 transition-all cursor-pointer ${
                            hoveredLayer === layer.id
                                ? "transform scale-105 shadow-2xl z-10"
                                : "hover:shadow-xl"
                        }`}
                        style={{
                            backgroundColor: layer.color || "#6366F1",
                            minHeight: "80px",
                        }}
                        onMouseEnter={() => setHoveredLayer(layer.id)}
                        onMouseLeave={() => setHoveredLayer(null)}
                        onClick={() => handleLayerClick(layer)}
                    >
                        <div className="p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{layer.label}</h3>
                                    <p className="text-sm opacity-90">{layer.height}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs opacity-75">Layer {layer.order}</span>
                                </div>
                            </div>
                            
                            {hoveredLayer === layer.id && layer.info && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 pt-4 border-t border-white/30"
                                >
                                    <p className="text-sm opacity-90">{layer.info.description}</p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

