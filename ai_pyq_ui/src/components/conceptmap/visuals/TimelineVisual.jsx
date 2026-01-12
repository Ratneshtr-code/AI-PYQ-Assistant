// components/conceptmap/visuals/TimelineVisual.jsx
import { useState } from "react";
import { motion } from "framer-motion";

export default function TimelineVisual({ topicData, onEventClick }) {
    const { startYear = 1800, endYear = 1900, events = [] } = topicData || {};
    const [hoveredEvent, setHoveredEvent] = useState(null);

    const totalYears = endYear - startYear;
    const timelineWidth = 100; // percentage

    const getEventPosition = (year) => {
        return ((year - startYear) / totalYears) * timelineWidth;
    };

    const getEventTypeColor = (type) => {
        switch (type) {
            case "major":
                return "bg-red-500";
            case "policy":
                return "bg-blue-500";
            case "event":
                return "bg-green-500";
            default:
                return "bg-gray-500";
        }
    };

    const handleEventClick = (event) => {
        if (onEventClick) {
            onEventClick({
                title: event.title,
                description: event.description,
                info: event.info,
            });
        }
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-gray-200 p-8">
            <div className="relative h-full">
                {/* Timeline Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2" />

                {/* Year Markers */}
                <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 flex justify-between">
                    {[startYear, startYear + totalYears / 2, endYear].map((year) => (
                        <div key={year} className="flex flex-col items-center">
                            <div className="w-2 h-2 bg-gray-600 rounded-full" />
                            <span className="text-xs text-gray-600 mt-2 font-medium">{year}</span>
                        </div>
                    ))}
                </div>

                {/* Events */}
                {events.map((event, index) => {
                    const position = getEventPosition(event.year);
                    return (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="absolute"
                            style={{
                                left: `${position}%`,
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            <div className="flex flex-col items-center">
                                {/* Event Marker */}
                                <motion.div
                                    className={`w-6 h-6 ${getEventTypeColor(event.type)} rounded-full shadow-lg cursor-pointer border-2 border-white hover:scale-125 transition-transform`}
                                    onClick={() => handleEventClick(event)}
                                    onMouseEnter={() => setHoveredEvent(event.id)}
                                    onMouseLeave={() => setHoveredEvent(null)}
                                    whileHover={{ scale: 1.3 }}
                                />
                                
                                {/* Event Label */}
                                <div
                                    className={`mt-2 text-center transition-opacity ${
                                        hoveredEvent === event.id ? "opacity-100" : "opacity-70"
                                    }`}
                                >
                                    <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                                        {event.year}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1 max-w-[120px]">
                                        {event.title}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

