// components/conceptmap/visuals/MapVisual.jsx
import { useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Fallback India map SVG path (used if external SVG not available)
const indiaOutline = "M 5 75 L 8 75 L 12 74 L 15 72 L 18 70 L 20 67 L 22 64 L 24 60 L 25 56 L 26 52 L 27 48 L 27 44 L 26 40 L 25 36 L 23 33 L 20 31 L 17 30 L 14 29 L 11 29 L 8 30 L 6 32 L 4 35 L 3 38 L 2 42 L 2 46 L 3 50 L 4 54 L 5 58 L 6 62 L 6 66 L 6 70 L 5 73 Z M 8 25 L 12 25 L 15 26 L 17 28 L 18 30 L 18 32 L 17 34 L 15 35 L 12 36 L 8 36 L 6 35 L 5 33 L 5 31 L 6 29 L 7 27 Z M 10 85 L 15 85 L 18 87 L 19 89 L 19 91 L 18 93 L 15 94 L 10 94 L 7 93 L 6 91 L 6 89 L 7 87 L 8 86 Z M 25 48 L 28 48 L 30 50 L 30 52 L 28 54 L 25 54 L 23 52 L 23 50 Z M 2 52 L 6 52 L 8 54 L 8 56 L 6 58 L 2 58 L 0 56 L 0 54 Z";

// State coordinates mapping (for fallback mode - approximate center points)
const STATE_COORDINATES = {
    "rajasthan": { x: 12, y: 40, name: "Rajasthan" },
    "madhya-pradesh": { x: 18, y: 50, name: "Madhya Pradesh" },
    "maharashtra": { x: 15, y: 60, name: "Maharashtra" },
    "karnataka": { x: 15, y: 70, name: "Karnataka" },
    "kerala": { x: 12, y: 80, name: "Kerala" },
    "uttarakhand": { x: 18, y: 30, name: "Uttarakhand" },
    "uttar-pradesh": { x: 20, y: 40, name: "Uttar Pradesh" },
    "bihar": { x: 25, y: 45, name: "Bihar" },
    "jharkhand": { x: 25, y: 55, name: "Jharkhand" },
    "odisha": { x: 28, y: 60, name: "Odisha" },
    "chhattisgarh": { x: 22, y: 58, name: "Chhattisgarh" },
    "telangana": { x: 18, y: 65, name: "Telangana" },
    "andhra-pradesh": { x: 20, y: 70, name: "Andhra Pradesh" },
    "tamil-nadu": { x: 18, y: 82, name: "Tamil Nadu" },
    "west-bengal": { x: 28, y: 48, name: "West Bengal" },
    "assam": { x: 32, y: 42, name: "Assam" },
    "arunachal-pradesh": { x: 35, y: 38, name: "Arunachal Pradesh" },
    "mizoram": { x: 32, y: 65, name: "Mizoram" },
    "gujarat": { x: 8, y: 50, name: "Gujarat" },
    "punjab": { x: 12, y: 28, name: "Punjab" },
    "haryana": { x: 15, y: 32, name: "Haryana" },
    "himachal-pradesh": { x: 14, y: 26, name: "Himachal Pradesh" },
    "jammu-kashmir": { x: 12, y: 20, name: "Jammu & Kashmir" },
    "ladakh": { x: 10, y: 18, name: "Ladakh" },
    "goa": { x: 12, y: 68, name: "Goa" },
    "sikkim": { x: 30, y: 35, name: "Sikkim" },
    "tripura": { x: 32, y: 50, name: "Tripura" },
    "meghalaya": { x: 30, y: 48, name: "Meghalaya" },
    "manipur": { x: 33, y: 52, name: "Manipur" },
    "nagaland": { x: 33, y: 45, name: "Nagaland" },
};

export default function MapVisual({ topicData, onElementClick }) {
    const { mapType = "state-categorized", states = [], regions = [], legend = {}, emptyStates = [] } = topicData || {};
    const [selectedState, setSelectedState] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [hoveredElement, setHoveredElement] = useState(null);
    const [svgContent, setSvgContent] = useState(null);
    const [useRealMap, setUseRealMap] = useState(false);
    const svgRef = useRef(null);

    // Try to load real India map SVG from backend
    useEffect(() => {
        fetch("/conceptmap/map/india-map.svg")
            .then(res => {
                if (res.ok) {
                    return res.text();
                }
                throw new Error("SVG not found");
            })
            .then(svg => {
                setSvgContent(svg);
                setUseRealMap(true);
            })
            .catch(() => {
                // Fallback to simplified map
                setUseRealMap(false);
            });
    }, []);

    // Helper function to find path by state ID (supports both data-state-id and id attributes)
    const findPathByStateId = useCallback((svgElement, stateId) => {
        // First try data-state-id attribute
        let path = svgElement.querySelector(`path[data-state-id="${stateId}"]`);
        if (path) return path;
        
        // Fallback to id attribute
        path = svgElement.querySelector(`path[id="${stateId}"]`);
        if (path) {
            // Add data-state-id for future use
            path.setAttribute('data-state-id', stateId);
            return path;
        }
        
        return null;
    }, []);

    // Apply colors to SVG states when using real map
    useEffect(() => {
        if (!useRealMap || !svgRef.current) return;

        // Small delay to ensure SVG is fully rendered
        const timeoutId = setTimeout(() => {
            const svgElement = svgRef.current;
            if (!svgElement) return;
            
            // Remove default fill from root SVG to prevent inheritance
            const rootSvg = svgElement.querySelector('svg');
            if (rootSvg) {
                rootSvg.removeAttribute('fill');
            }
            
            // Reset all states to default (check both data-state-id and id)
            const allPaths = svgElement.querySelectorAll('path[data-state-id], path[id]');
        allPaths.forEach(path => {
            // Skip if it's not a state path (e.g., outline paths, SVG container paths)
            const stateId = path.getAttribute('data-state-id') || path.getAttribute('id');
            if (!stateId || 
                stateId === 'india-outline' || 
                stateId === 'features' || 
                stateId === 'svg36' ||
                stateId.startsWith('defs') ||
                stateId.startsWith('namedview')) return;
            
            // Force reset styling - override any inherited fill
            path.setAttribute('fill', 'transparent');
            path.setAttribute('stroke', '#9CA3AF');
            path.setAttribute('stroke-width', '0.5');
            path.style.fill = 'transparent';
            path.style.stroke = '#9CA3AF';
            path.style.strokeWidth = '0.5px';
            path.style.opacity = '1';
            path.style.cursor = 'default';
        });

        // Apply colors based on map type
        if (mapType === "state-categorized") {
            // Color states with content
            states.forEach(state => {
                const path = findPathByStateId(svgElement, state.id);
                if (path) {
                    const color = state.color || '#F97316';
                    path.setAttribute('fill', color);
                    path.setAttribute('stroke', '#FFFFFF');
                    path.setAttribute('stroke-width', '1');
                    path.style.fill = color;
                    path.style.stroke = '#FFFFFF';
                    path.style.strokeWidth = '1px';
                    path.style.cursor = state.hasContent ? 'pointer' : 'default';
                    path.style.opacity = '1';
                } else {
                    console.warn(`State path not found for: ${state.id}. Make sure the SVG has id="${state.id}" or data-state-id="${state.id}"`);
                }
            });

            // Color empty states
            emptyStates.forEach(state => {
                const stateId = typeof state === 'string' ? state : state.id;
                const stateColor = (typeof state === 'object' && state.color) || '#E5E7EB';
                const path = findPathByStateId(svgElement, stateId);
                if (path) {
                    path.setAttribute('fill', stateColor);
                    path.setAttribute('stroke', '#9CA3AF');
                    path.setAttribute('stroke-width', '0.5');
                    path.style.fill = stateColor;
                    path.style.stroke = '#9CA3AF';
                    path.style.strokeWidth = '0.5px';
                    path.style.opacity = '0.6';
                }
            });
        } else if (mapType === "regional-shading") {
            // Color regions
            regions.forEach(region => {
                region.states?.forEach(stateId => {
                    const path = findPathByStateId(svgElement, stateId);
                    if (path) {
                        path.setAttribute('fill', region.color);
                        path.setAttribute('stroke', '#FFFFFF');
                        path.setAttribute('stroke-width', '0.5');
                        path.style.cursor = 'pointer';
                        path.style.opacity = '1';
                    }
                });
            });
            }
            
            console.log(`Applied colors to ${states.length} states, ${emptyStates.length} empty states`);
        }, 100);
        
        return () => clearTimeout(timeoutId);
    }, [useRealMap, mapType, states, regions, emptyStates, findPathByStateId]);

    const handleStateClick = useCallback((state) => {
        if (state.hasContent && state.items && state.items.length > 0) {
            setSelectedState(state);
            if (onElementClick) {
                onElementClick({
                    title: state.name,
                    description: `Items in ${state.name}`,
                    info: {
                        items: state.items,
                        count: state.items.length
                    }
                });
            }
        }
    }, [onElementClick]);

    const handleRegionClick = useCallback((region) => {
        setSelectedRegion(region);
        if (onElementClick) {
            onElementClick({
                title: region.name,
                description: region.info?.description || "",
                info: region.info,
            });
        }
    }, [onElementClick]);

    const handleItemClick = useCallback((item, stateName) => {
        if (onElementClick) {
            onElementClick({
                title: item.name,
                description: item.info?.description || "",
                info: {
                    ...item.info,
                    state: stateName,
                    icon: item.icon
                }
            });
        }
    }, [onElementClick]);

    // Handle clicks on SVG paths (for real map)
    const handleSvgPathClick = useCallback((e) => {
        const path = e.target.closest('path');
        if (!path) return;

        // Get state ID from either data-state-id or id attribute
        let stateId = path.getAttribute('data-state-id');
        if (!stateId) {
            stateId = path.getAttribute('id');
        }
        
        // Skip non-state paths
        if (!stateId || stateId === 'india-outline' || stateId === 'features' || stateId === 'svg36') return;
        
        if (mapType === "state-categorized") {
            const state = states.find(s => s.id === stateId);
            if (state) {
                handleStateClick(state);
            }
        } else if (mapType === "regional-shading") {
            const region = regions.find(r => r.states?.includes(stateId));
            if (region) {
                handleRegionClick(region);
            }
        }
    }, [mapType, states, regions, handleStateClick, handleRegionClick]);

    // Render with real SVG map
    if (useRealMap && svgContent) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-gray-200 p-4">
                <div className="relative w-full h-full" style={{ minHeight: "500px" }}>
                    <div
                        ref={svgRef}
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                        onClick={handleSvgPathClick}
                        className="w-full h-full"
                        style={{ minHeight: "500px" }}
                        onLoad={() => {
                            // Force re-apply colors after SVG loads
                            if (svgRef.current) {
                                const event = new Event('svg-loaded');
                                svgRef.current.dispatchEvent(event);
                            }
                        }}
                    />
                    
                    {/* Legend */}
                    {legend && legend.items && (
                        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
                            {legend.title && (
                                <h4 className="font-bold text-sm text-gray-900 mb-2">{legend.title}</h4>
                            )}
                            <div className="space-y-1">
                                {legend.items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                        <div 
                                            className="w-4 h-4 rounded" 
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-gray-700">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* State Details Panel */}
                    <AnimatePresence>
                        {selectedState && selectedState.items && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm w-full max-h-[70%] overflow-hidden z-10"
                            >
                                <div className="p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">{selectedState.name}</h3>
                                        <button
                                            onClick={() => setSelectedState(null)}
                                            className="text-white hover:text-gray-200"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <p className="text-sm text-orange-100 mt-1">
                                        {selectedState.items.length} {legend?.title || "items"}
                                    </p>
                                </div>
                                <div className="p-4 overflow-y-auto max-h-[400px]">
                                    <div className="space-y-2">
                                        {selectedState.items.map((item, index) => (
                                            <motion.button
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => handleItemClick(item, selectedState.name)}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                                            >
                                                <div className="flex items-start gap-2">
                                                    {item.icon && (
                                                        <span className="text-xl">{item.icon}</span>
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900 text-sm">
                                                            {item.name}
                                                        </p>
                                                        {item.info?.description && (
                                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                                {item.info.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // Fallback: Render simplified map with circles (current implementation)
    // Render state-categorized map
    if (mapType === "state-categorized") {
        return (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-gray-200 p-4">
                <div className="relative w-full h-full" style={{ minHeight: "500px" }}>
                    <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {/* Background */}
                        <rect width="100" height="100" fill="#F0F9FF" />
                        
                        {/* Grid (optional) */}
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E0E7FF" strokeWidth="0.3" opacity="0.3"/>
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" opacity="0.1" />
                        
                        {/* India Map Outline */}
                        <path
                            d={indiaOutline}
                            fill="#FFFFFF"
                            stroke="#9CA3AF"
                            strokeWidth="0.5"
                        />
                        
                        {/* Render States */}
                        {states.map((state) => {
                            const coords = STATE_COORDINATES[state.id];
                            if (!coords) return null;
                            
                            const isSelected = selectedState?.id === state.id;
                            const isHovered = hoveredElement === state.id;
                            
                            return (
                                <g key={state.id}>
                                    {/* State Circle/Area */}
                                    <motion.circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r={isSelected || isHovered ? 3.5 : 3}
                                        fill={state.color || "#F97316"}
                                        stroke="#FFFFFF"
                                        strokeWidth={isSelected ? 0.4 : 0.2}
                                        className="cursor-pointer"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.1, type: "spring" }}
                                        onClick={() => handleStateClick(state)}
                                        onMouseEnter={() => setHoveredElement(state.id)}
                                        onMouseLeave={() => setHoveredElement(null)}
                                        whileHover={{ scale: 1.2 }}
                                    />
                                    
                                    {/* State Label */}
                                    <text
                                        x={coords.x}
                                        y={coords.y + (isSelected ? 5.5 : 5)}
                                        textAnchor="middle"
                                        fontSize={isSelected ? "1.2" : "1"}
                                        fontWeight={isSelected ? "bold" : "normal"}
                                        fill={isSelected ? "#1F2937" : "#4B5563"}
                                        className="pointer-events-none"
                                    >
                                        {state.name}
                                    </text>
                                    
                                    {/* Item Count Badge */}
                                    {state.hasContent && state.items && (
                                        <motion.circle
                                            cx={coords.x + 1.5}
                                            cy={coords.y - 1.5}
                                            r="1"
                                            fill="#EF4444"
                                            stroke="#FFFFFF"
                                            strokeWidth="0.2"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2 }}
                                        />
                                    )}
                                </g>
                            );
                        })}
                        
                        {/* Empty States (grey) */}
                        {emptyStates.map((state) => {
                            const coords = STATE_COORDINATES[state.id];
                            if (!coords) return null;
                            
                            return (
                                <g key={state.id}>
                                    <circle
                                        cx={coords.x}
                                        cy={coords.y}
                                        r="2.5"
                                        fill={state.color || "#E5E7EB"}
                                        stroke="#FFFFFF"
                                        strokeWidth="0.2"
                                        opacity="0.6"
                                    />
                                    <text
                                        x={coords.x}
                                        y={coords.y + 4.5}
                                        textAnchor="middle"
                                        fontSize="0.9"
                                        fill="#9CA3AF"
                                        className="pointer-events-none"
                                    >
                                        {state.name}
                                    </text>
                                </g>
                            );
                        })}
                        
                        {/* Legend */}
                        {legend && legend.items && (
                            <g transform="translate(2, 88)">
                                <rect
                                    x="0"
                                    y="0"
                                    width="20"
                                    height={legend.items.length * 2.5 + 1}
                                    rx="0.5"
                                    fill="rgba(255, 255, 255, 0.95)"
                                    stroke="#9CA3AF"
                                    strokeWidth="0.2"
                                />
                                {legend.title && (
                                    <text x="1" y="1.5" fontSize="1.1" fontWeight="bold" fill="#1F2937">
                                        {legend.title}
                                    </text>
                                )}
                                {legend.items.map((item, index) => (
                                    <g key={index} transform={`translate(1, ${2.5 + index * 2.5})`}>
                                        <rect x="0" y="0" width="1.2" height="1.2" fill={item.color} rx="0.1" />
                                        <text x="1.5" y="1" fontSize="0.9" fill="#4B5563">
                                            {item.label}
                                        </text>
                                    </g>
                                ))}
                            </g>
                        )}
                    </svg>
                    
                    {/* State Details Panel */}
                    <AnimatePresence>
                        {selectedState && selectedState.items && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm w-full max-h-[70%] overflow-hidden"
                            >
                                <div className="p-4 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">{selectedState.name}</h3>
                                        <button
                                            onClick={() => setSelectedState(null)}
                                            className="text-white hover:text-gray-200"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <p className="text-sm text-orange-100 mt-1">
                                        {selectedState.items.length} {legend?.title || "items"}
                                    </p>
                                </div>
                                <div className="p-4 overflow-y-auto max-h-[400px]">
                                    <div className="space-y-2">
                                        {selectedState.items.map((item, index) => (
                                            <motion.button
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => handleItemClick(item, selectedState.name)}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                                            >
                                                <div className="flex items-start gap-2">
                                                    {item.icon && (
                                                        <span className="text-xl">{item.icon}</span>
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900 text-sm">
                                                            {item.name}
                                                        </p>
                                                        {item.info?.description && (
                                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                                {item.info.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // Render regional-shading map (fallback mode)
    if (mapType === "regional-shading") {
        return (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-gray-200 p-4">
                <div className="relative w-full h-full" style={{ minHeight: "500px" }}>
                    <svg
                        viewBox="0 0 100 100"
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {/* Background */}
                        <rect width="100" height="100" fill="#F0F9FF" />
                        
                        {/* India Map Outline */}
                        <path
                            d={indiaOutline}
                            fill="#FFFFFF"
                            stroke="#9CA3AF"
                            strokeWidth="0.5"
                        />
                        
                        {/* Render Regions */}
                        {regions.map((region, index) => {
                            // For each region, render state circles with region color
                            return region.states?.map((stateId) => {
                                const coords = STATE_COORDINATES[stateId];
                                if (!coords) return null;
                                
                                const isSelected = selectedRegion?.id === region.id;
                                const isHovered = hoveredElement === `${region.id}-${stateId}`;
                                
                                return (
                                    <g key={`${region.id}-${stateId}`}>
                                        <motion.circle
                                            cx={coords.x}
                                            cy={coords.y}
                                            r={isSelected || isHovered ? 3.5 : 3}
                                            fill={region.color}
                                            stroke="#FFFFFF"
                                            strokeWidth={isSelected ? 0.4 : 0.2}
                                            opacity={isSelected ? 1 : 0.8}
                                            className="cursor-pointer"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: isSelected ? 1 : 0.8 }}
                                            transition={{ delay: index * 0.05, type: "spring" }}
                                            onClick={() => handleRegionClick(region)}
                                            onMouseEnter={() => setHoveredElement(`${region.id}-${stateId}`)}
                                            onMouseLeave={() => setHoveredElement(null)}
                                            whileHover={{ scale: 1.2, opacity: 1 }}
                                        />
                                        {isHovered && (
                                            <text
                                                x={coords.x}
                                                y={coords.y - 4}
                                                textAnchor="middle"
                                                fontSize="1"
                                                fontWeight="bold"
                                                fill="#1F2937"
                                                className="pointer-events-none"
                                            >
                                                {region.name}
                                            </text>
                                        )}
                                    </g>
                                );
                            });
                        })}
                        
                        {/* Legend */}
                        {legend && legend.items && (
                            <g transform="translate(2, 75)">
                                <rect
                                    x="0"
                                    y="0"
                                    width="25"
                                    height={legend.items.length * 2.8 + 1.5}
                                    rx="0.5"
                                    fill="rgba(255, 255, 255, 0.95)"
                                    stroke="#9CA3AF"
                                    strokeWidth="0.2"
                                />
                                {legend.title && (
                                    <text x="1" y="1.8" fontSize="1.2" fontWeight="bold" fill="#1F2937">
                                        {legend.title}
                                    </text>
                                )}
                                {legend.items.map((item, index) => (
                                    <g key={index} transform={`translate(1, ${2.5 + index * 2.8})`}>
                                        <rect x="0" y="0" width="1.5" height="1.5" fill={item.color} rx="0.2" />
                                        <text x="2" y="1.2" fontSize="0.95" fill="#4B5563" fontWeight="500">
                                            {item.label}
                                        </text>
                                    </g>
                                ))}
                            </g>
                        )}
                    </svg>
                </div>
            </div>
        );
    }

    // Fallback for unknown map type
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Unknown map type: {mapType}</p>
        </div>
    );
}
