// components/conceptmap/visuals/TimelineVisual.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TimelineVisual({ topicData }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [expandedPhase, setExpandedPhase] = useState(null);

    if (!topicData || !topicData.data) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">No timeline data available</p>
            </div>
        );
    }

    const { data } = topicData;
    const events = data.events || [];
    const phases = data.phases || [];
    const startYear = data.startYear || 1800;
    const endYear = data.endYear || 1900;

    // Group events by phase if phases exist
    const eventsByPhase = phases.length > 0
        ? phases.map(phase => ({
            ...phase,
            events: events.filter(e => e.phase === phase.id)
        }))
        : [{ id: "all", name: "All Events", events }];

    const getEventColor = (type) => {
        const colors = {
            political: "bg-red-500 border-red-600",
            social: "bg-blue-500 border-blue-600",
            economic: "bg-orange-500 border-orange-600",
            military: "bg-purple-500 border-purple-600",
            cultural: "bg-green-500 border-green-600",
            major: "bg-red-600 border-red-700",
            event: "bg-blue-500 border-blue-600",
            policy: "bg-orange-500 border-orange-600",
        };
        return colors[type] || "bg-gray-500 border-gray-600";
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-auto">
            <div className="p-6 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{topicData.title}</h2>
                    {topicData.description && (
                        <p className="text-gray-600">{topicData.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                        <span>📅 {startYear} - {endYear}</span>
                        <span>•</span>
                        <span>{events.length} Events</span>
                    </div>
                </div>

                {/* Legend */}
                {data.legend && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Legend</h3>
                        <div className="flex flex-wrap gap-4">
                            {data.legend.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full ${getEventColor(item.type)}`}></div>
                                    <span className="text-sm text-gray-600">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline by Phases */}
                {eventsByPhase.map((phase, phaseIdx) => (
                    <div key={phase.id} className="mb-8">
                        {phases.length > 0 && (
                            <div 
                                className="mb-4 p-4 bg-white rounded-lg shadow-sm border-l-4 border-blue-500 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{phase.name}</h3>
                                        {phase.period && (
                                            <p className="text-sm text-gray-600 mt-1">{phase.period}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-500">{phase.events.length} events</span>
                                        <svg 
                                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedPhase === phase.id ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {phase.description && expandedPhase === phase.id && (
                                    <p className="mt-3 text-gray-600 text-sm">{phase.description}</p>
                                )}
                            </div>
                        )}

                        <AnimatePresence>
                            {(phases.length === 0 || expandedPhase === phase.id || expandedPhase === null) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="relative"
                                >
                                    {/* Timeline Line */}
                                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200"></div>

                                    {/* Events */}
                                    <div className="space-y-6">
                                        {phase.events.map((event, idx) => (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="relative pl-20"
                                            >
                                                {/* Year Badge */}
                                                <div className="absolute left-0 top-0 w-16 text-center">
                                                    <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold ${getEventColor(event.type)}`}>
                                                        {event.year}
                                                    </div>
                                                </div>

                                                {/* Event Card */}
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    className="bg-white rounded-lg shadow-md border border-gray-200 p-4 cursor-pointer hover:shadow-lg transition-shadow"
                                                    onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {event.icon && <span className="text-2xl">{event.icon}</span>}
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-800 text-lg">{event.title}</h4>
                                                            <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                                                            
                                                            {/* Expanded Details */}
                                                            <AnimatePresence>
                                                                {selectedEvent?.id === event.id && event.details && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: "auto" }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="mt-3 pt-3 border-t border-gray-200"
                                                                    >
                                                                        {typeof event.details === 'string' ? (
                                                                            <p className="text-gray-700 text-sm">{event.details}</p>
                                                                        ) : (
                                                                            <div className="space-y-3">
                                                                                {/* Render all detail fields dynamically */}
                                                                                {Object.entries(event.details).map(([key, value]) => {
                                                                                    // Skip null/undefined values
                                                                                    if (value === null || value === undefined) return null;
                                                                                    
                                                                                    // Define styling for specific field types
                                                                                    const fieldConfig = {
                                                                                        founder: { icon: '👤', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', content: 'text-blue-900', label: 'Founder' },
                                                                                        founders: { icon: '👥', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', content: 'text-blue-900', label: 'Founders' },
                                                                                        place: { icon: '📍', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', content: 'text-green-900', label: 'Place' },
                                                                                        objectives: { icon: '🎯', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', content: 'text-purple-900', label: 'Objectives' },
                                                                                        activities: { icon: '⚡', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', content: 'text-orange-900', label: 'Activities' },
                                                                                        achievements: { icon: '🏆', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', content: 'text-green-900', label: 'Achievements' },
                                                                                        significance: { icon: '⭐', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', content: 'text-yellow-900', label: 'Significance' },
                                                                                        limitation: { icon: '⚠️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', content: 'text-red-900', label: 'Limitation' },
                                                                                        limitations: { icon: '⚠️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', content: 'text-red-900', label: 'Limitations' },
                                                                                        members: { icon: '👥', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', content: 'text-indigo-900', label: 'Members' },
                                                                                        leaders: { icon: '👔', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', content: 'text-blue-900', label: 'Leaders' },
                                                                                        context: { icon: '📖', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', content: 'text-blue-900', label: 'Context' },
                                                                                        mainProvisions: { icon: '✓', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', content: 'text-green-900', label: 'Main Provisions' },
                                                                                        keyPoint: { icon: '🔑', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', content: 'text-purple-900', label: 'Key Point' },
                                                                                        examNote: { icon: '💡', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', content: 'text-pink-900', label: 'Exam Note' },
                                                                                        examImportant: { icon: '🎓', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', content: 'text-pink-900', label: 'Important for Exams' },
                                                                                        uniqueness: { icon: '✨', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', content: 'text-cyan-900', label: 'Unique Feature' },
                                                                                        formation: { icon: '🔨', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', content: 'text-gray-900', label: 'Formation' },
                                                                                        character: { icon: '📋', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', content: 'text-gray-900', label: 'Character' },
                                                                                        connection: { icon: '🔗', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', content: 'text-teal-900', label: 'Connection' },
                                                                                        note: { icon: '📝', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', content: 'text-gray-900', label: 'Note' },
                                                                                    };
                                                                                    
                                                                                    const config = fieldConfig[key] || { 
                                                                                        icon: '📌', 
                                                                                        bg: 'bg-gray-50', 
                                                                                        border: 'border-gray-300', 
                                                                                        text: 'text-gray-800', 
                                                                                        content: 'text-gray-900',
                                                                                        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
                                                                                    };
                                                                                    
                                                                                    // Render based on value type
                                                                                    if (typeof value === 'string') {
                                                                                        return (
                                                                                            <div key={key} className={`p-3 ${config.bg} rounded border ${config.border}`}>
                                                                                                <p className={`text-xs font-semibold ${config.text} mb-1`}>
                                                                                                    {config.icon} {config.label}
                                                                                                </p>
                                                                                                <p className={`text-sm ${config.content}`}>{value}</p>
                                                                                            </div>
                                                                                        );
                                                                                    } else if (Array.isArray(value)) {
                                                                                        // Check if array contains objects or primitives
                                                                                        const hasObjects = value.length > 0 && typeof value[0] === 'object';
                                                                                        
                                                                                        return (
                                                                                            <div key={key} className={`p-3 ${config.bg} rounded border ${config.border}`}>
                                                                                                <p className={`text-xs font-semibold ${config.text} mb-2`}>
                                                                                                    {config.icon} {config.label}
                                                                                                </p>
                                                                                                {hasObjects ? (
                                                                                                    // Array of objects - render each as a card
                                                                                                    <div className="space-y-2">
                                                                                                        {value.map((item, i) => (
                                                                                                            <div key={i} className="p-2 bg-white bg-opacity-50 rounded border border-gray-200">
                                                                                                                {Object.entries(item).map(([objKey, objValue]) => (
                                                                                                                    <div key={objKey} className="mb-1 last:mb-0">
                                                                                                                        <strong className="text-xs capitalize text-gray-700">
                                                                                                                            {objKey.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                                                        </strong>
                                                                                                                        {Array.isArray(objValue) ? (
                                                                                                                            <ul className="list-disc list-inside ml-3 text-xs text-gray-600">
                                                                                                                                {objValue.map((subItem, idx) => (
                                                                                                                                    <li key={idx}>{subItem}</li>
                                                                                                                                ))}
                                                                                                                            </ul>
                                                                                                                        ) : (
                                                                                                                            <span className="text-xs text-gray-600 ml-1">{objValue}</span>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    // Array of primitives - render as list
                                                                                                    <ul className={`list-disc list-inside space-y-1 text-sm ${config.content}`}>
                                                                                                        {value.map((item, i) => (
                                                                                                            <li key={i}>{item}</li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    } else if (typeof value === 'object') {
                                                                                        // Nested object - render recursively
                                                                                        return (
                                                                                            <div key={key} className={`p-3 ${config.bg} rounded border ${config.border}`}>
                                                                                                <p className={`text-xs font-semibold ${config.text} mb-2`}>
                                                                                                    {config.icon} {config.label}
                                                                                                </p>
                                                                                                <div className={`space-y-1 text-sm ${config.content}`}>
                                                                                                    {Object.entries(value).map(([subKey, subValue]) => (
                                                                                                        <div key={subKey}>
                                                                                                            <strong className="capitalize">
                                                                                                                {subKey.replace(/([A-Z])/g, ' $1').trim()}:
                                                                                                            </strong>{' '}
                                                                                                            {Array.isArray(subValue) ? (
                                                                                                                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                                                                                                                    {subValue.map((item, idx) => (
                                                                                                                        <li key={idx}>{item}</li>
                                                                                                                    ))}
                                                                                                                </ul>
                                                                                                            ) : (
                                                                                                                <span>{subValue}</span>
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

                                                            {/* Tags */}
                                                            {event.tags && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {event.tags.map((tag, i) => (
                                                                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}

