// components/conceptmap/SubjectSelector.jsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SubjectSelector({ subjects, selectedSubject, onSelectSubject, isCollapsed = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    if (isCollapsed) {
        return (
            <div className="h-full overflow-y-auto py-2">
                <div className="space-y-2 px-2">
                    {subjects.map((subject, index) => (
                        <motion.button
                            key={subject.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onSelectSubject(subject.id)}
                            className={`w-full aspect-square rounded-lg transition-all duration-200 flex items-center justify-center relative group ${
                                selectedSubject === subject.id
                                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg ring-2 ring-blue-300"
                                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-blue-300"
                            }`}
                            title={subject.name}
                        >
                            <span className="text-xl">{subject.icon}</span>
                            {selectedSubject === subject.id && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full ring-2 ring-white"
                                />
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

    return (
        <div className="relative" ref={dropdownRef} style={{ zIndex: 9999 }}>
            {/* Dropdown Trigger Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 relative overflow-hidden group ${
                    selectedSubject
                        ? "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md"
                }`}
            >
                <div className="flex items-center gap-3 relative z-10">
                    <span className={`text-xl flex-shrink-0 ${selectedSubject ? "drop-shadow-sm" : ""}`}>
                        {selectedSubjectData?.icon || "📚"}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${
                            selectedSubject ? "text-white" : "text-gray-800"
                        }`}>
                            {selectedSubjectData?.name || "Select Subject"}
                        </p>
                    </div>
                    <motion.svg
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${selectedSubject ? "text-white" : "text-gray-500"} ${
                            isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                </div>
                
                {/* Selection indicator */}
                {selectedSubject && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"
                    />
                )}
            </motion.button>

            {/* Dropdown Menu - Overlays above topics */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden max-h-[70vh] overflow-y-auto"
                        style={{
                            position: 'absolute',
                            zIndex: 9999,
                            backgroundColor: '#ffffff',
                            opacity: 1
                        }}
                    >
                            <div className="py-2">
                                {subjects.map((subject, index) => (
                                    <motion.button
                                        key={subject.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        onClick={() => {
                                            onSelectSubject(subject.id);
                                            setIsOpen(false);
                                        }}
                                        whileHover={{ scale: 1.02, x: 2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`w-full text-left p-3 transition-all duration-200 relative overflow-hidden group ${
                                            selectedSubject === subject.id
                                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500"
                                                : "hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <span className={`text-xl flex-shrink-0 ${
                                                selectedSubject === subject.id ? "drop-shadow-sm" : ""
                                            }`}>
                                                {subject.icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold text-sm ${
                                                    selectedSubject === subject.id ? "text-blue-700" : "text-gray-800"
                                                }`}>
                                                    {subject.name}
                                                </p>
                                            </div>
                                            {selectedSubject === subject.id && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                                />
                                            )}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
