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
                                                                            <div className="space-y-2">
                                                                                {event.details.points && (
                                                                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                                                                        {event.details.points.map((point, i) => (
                                                                                            <li key={i}>{point}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                )}
                                                                                {event.details.significance && (
                                                                                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                                                                        <p className="text-xs font-semibold text-yellow-800 mb-1">Significance:</p>
                                                                                        <p className="text-sm text-yellow-900">{event.details.significance}</p>
                                                                                    </div>
                                                                                )}
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

