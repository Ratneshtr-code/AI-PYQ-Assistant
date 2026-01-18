// components/conceptmap/SubjectPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { buildApiUrl } from "../../config/apiConfig";
import { useMobileDetection } from "../../utils/useMobileDetection";

export default function SubjectPage() {
    const navigate = useNavigate();
    const isMobile = useMobileDetection();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const url = buildApiUrl("conceptmap/subjects");
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!res.ok) {
                    console.error("Failed to fetch subjects");
                    setSubjects([]);
                    return;
                }

                const data = await res.json();
                setSubjects(data.subjects || []);
            } catch (err) {
                console.error("Error fetching subjects:", err);
                setSubjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
    }, []);

    const handleSubjectClick = (subjectId) => {
        navigate(`/conceptmap/subjects/${subjectId}/learning-path`);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Top Bar with Home Navigation */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm z-10">
                <div className="flex items-center justify-between px-4 md:px-6 py-3">
                    {/* Home Navigation Button */}
                    <motion.button
                        onClick={() => navigate("/home")}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
                        title="Back to Home"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                            <span className="text-white font-bold text-sm">AI</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 hidden md:block group-hover:text-gray-900 transition-colors">
                            AI PYQ Assistant
                        </span>
                    </motion.button>

                    {/* Page Title */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 text-center"
                    >
                        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            🗺️ ConceptMap
                        </h1>
                        <p className="text-xs md:text-sm text-gray-600 hidden md:block">
                            Static content learning platform for concept exploration
                        </p>
                    </motion.div>

                    {/* Desktop Spacer for balance */}
                    <div className="hidden md:block w-[180px]"></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="w-full max-w-7xl mx-auto px-2 md:px-4 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-8"
                    >
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                            Select a Subject
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            Choose a subject to explore its learning path and topics
                        </p>
                    </motion.div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                <p className="text-gray-600 text-sm">Loading subjects...</p>
                            </div>
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 text-center">
                            <p className="text-gray-500 text-lg">No subjects available</p>
                        </div>
                    ) : (
                        /* Subject Cards Grid */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
                            {subjects.map((subject, index) => (
                                <motion.div
                                    key={subject.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05, duration: 0.3 }}
                                    onClick={() => handleSubjectClick(subject.id)}
                                    className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 hover:border-indigo-300 cursor-pointer transition-all duration-300 overflow-hidden p-4 md:p-6 flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px]"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Content */}
                                    <div className="relative z-10 text-center w-full">
                                        {/* Subject Icon */}
                                        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md group-hover:shadow-lg transition-shadow">
                                            <span className="text-2xl md:text-3xl">{subject.icon}</span>
                                        </div>
                                        
                                        {/* Subject Name */}
                                        <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                            {subject.name}
                                        </h3>
                                        
                                        {/* Arrow Indicator */}
                                        <div className="mt-2 flex items-center justify-center text-indigo-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span>Explore</span>
                                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

