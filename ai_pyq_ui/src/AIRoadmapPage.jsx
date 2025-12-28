// src/AIRoadmapPage.jsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";

export default function AIRoadmapPage() {
    const [exam, setExam] = useState("");
    const [examsList, setExamsList] = useState([]);
    const [roadmapData, setRoadmapData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(false);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState(new Set());
    const [showCelebration, setShowCelebration] = useState(false);
    const [prevProgress, setPrevProgress] = useState(0);
    const progressBarRef = useRef(null);

    useEffect(() => {
        // Fetch exam filters
        const fetchExams = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/filters");
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();
    }, []);

    useEffect(() => {
        if (!exam) {
            setRoadmapData(null);
            return;
        }

        const fetchRoadmap = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `http://127.0.0.1:8000/roadmap/generate?exam=${encodeURIComponent(exam)}`
                );
                const data = await res.json();
                
                if (data.error) {
                    setError(data.error);
                    setRoadmapData(null);
                } else {
                    setRoadmapData(data);
                    setError(null);
                    setSimulatedProgress(0);
                    setSelectedSubjects(new Set());
                    setShowCelebration(false);
                }
            } catch (err) {
                setError("Failed to load roadmap. Please try again.");
                setRoadmapData(null);
                console.error("Roadmap fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoadmap();
    }, [exam]);

    // Track progress changes for celebration
    useEffect(() => {
        if (simulatedProgress >= 100 && prevProgress < 100) {
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 3000);
        }
        setPrevProgress(simulatedProgress);
    }, [simulatedProgress, prevProgress]);

    // Update progress when subjects are toggled
    useEffect(() => {
        if (!roadmapData) return;
        
        let totalWeightage = 0;
        selectedSubjects.forEach((idx) => {
            if (roadmapData.subjects[idx]) {
                totalWeightage += roadmapData.subjects[idx].weightage;
            }
        });
        
        setSimulatedProgress(Math.min(100, totalWeightage));
    }, [selectedSubjects, roadmapData]);

    // Interactive progress bar handlers
    const updateProgress = (clientX) => {
        if (!progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
        setSimulatedProgress(percentage);
        
        // Update selected subjects based on progress
        if (roadmapData) {
            const newSelected = new Set();
            let cumulative = 0;
            roadmapData.subjects.forEach((subject, idx) => {
                cumulative += subject.weightage;
                if (cumulative <= percentage) {
                    newSelected.add(idx);
                }
            });
            setSelectedSubjects(newSelected);
        }
    };

    const handleProgressClick = (e) => {
        updateProgress(e.clientX);
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        updateProgress(e.clientX);
    };

    const handleReset = () => {
        setSimulatedProgress(0);
        setSelectedSubjects(new Set());
        setShowCelebration(false);
    };

    const toggleSubject = (subjectIdx) => {
        const newSelected = new Set(selectedSubjects);
        if (newSelected.has(subjectIdx)) {
            newSelected.delete(subjectIdx);
        } else {
            newSelected.add(subjectIdx);
        }
        setSelectedSubjects(newSelected);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            updateProgress(e.clientX);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, roadmapData]);

    const getWeightageColor = (weightage) => {
        if (weightage >= 15) return "bg-emerald-500";
        if (weightage >= 10) return "bg-blue-500";
        if (weightage >= 5) return "bg-yellow-500";
        return "bg-gray-400";
    };

    // Calculate which subjects are covered based on simulated progress
    const getCoveredSubjects = () => {
        if (!roadmapData) return [];
        let cumulative = 0;
        return roadmapData.subjects.filter((subject) => {
            cumulative += subject.weightage;
            return cumulative <= simulatedProgress;
        });
    };

    const coveredSubjects = getCoveredSubjects();
    const nextSubjectIndex = coveredSubjects.length;

    // Calculate dynamic milestones based on subject cumulative weightage
    const getDynamicMilestones = () => {
        if (!roadmapData) return [];
        const milestones = [];
        let cumulative = 0;
        roadmapData.subjects.forEach((subject, idx) => {
            cumulative += subject.weightage;
            milestones.push({
                percentage: Math.min(100, cumulative),
                subjectName: subject.name,
                subjectIndex: idx,
                cumulativeWeightage: cumulative
            });
        });
        return milestones;
    };

    const dynamicMilestones = getDynamicMilestones();

    // Confetti component
    const Confetti = () => {
        const confettiPieces = Array.from({ length: 50 }, (_, i) => i);
        return (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {confettiPieces.map((i) => (
                    <motion.div
                        key={i}
                        className="absolute w-3 h-3 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][Math.floor(Math.random() * 5)],
                        }}
                        initial={{
                            y: -100,
                            x: 0,
                            rotate: 0,
                            opacity: 1,
                        }}
                        animate={{
                            y: window.innerHeight + 100,
                            x: (Math.random() - 0.5) * 200,
                            rotate: Math.random() * 360,
                            opacity: [1, 1, 0],
                        }}
                        transition={{
                            duration: 2 + Math.random(),
                            delay: Math.random() * 0.5,
                            ease: "easeOut",
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
            {/* Celebration Confetti */}
            <AnimatePresence>
                {showCelebration && <Confetti />}
            </AnimatePresence>

            {/* Primary Sidebar */}
            <Sidebar
                exam={exam}
                setExam={setExam}
                examsList={examsList}
                onOpenSecondarySidebar={() => setSecondarySidebarOpen(!secondarySidebarOpen)}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                    if (isCollapsed) {
                        setSecondarySidebarOpen(false);
                    }
                }}
            />

            {/* Main Content */}
            <div
                className={`flex-1 transition-all duration-300 ${
                    primarySidebarCollapsed ? "ml-16" : "ml-64"
                }`}
            >
                <div className={`p-6 max-w-7xl mx-auto ${roadmapData && !loading && !error ? 'pb-56' : 'pb-6'}`}>
                    {/* Compact Header */}
                    <div className="mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        🎯 AI Roadmap
                                    </h1>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Strategic preparation based on question weightage
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Compact Exam Selector */}
                    <div className="mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
                        >
                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                                Select Exam
                            </label>
                            <select
                                value={exam}
                                onChange={(e) => setExam(e.target.value)}
                                className="w-full md:w-80 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                            >
                                <option value="">-- Select an exam --</option>
                                {examsList.map((examName) => (
                                    <option key={examName} value={examName}>
                                        {examName}
                                    </option>
                                ))}
                            </select>
                        </motion.div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                <p className="text-gray-600 text-sm">Generating roadmap...</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"
                        >
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </motion.div>
                    )}

                    {/* Empty State */}
                    {!exam && !loading && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200"
                        >
                            <div className="text-5xl mb-3">🎯</div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                Select an Exam to Generate Roadmap
                            </h3>
                            <p className="text-sm text-gray-600">
                                Choose an exam to see your personalized preparation roadmap
                            </p>
                        </motion.div>
                    )}

                    {/* Roadmap Content */}
                    {roadmapData && !loading && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                        >
                            {/* Compact Subjects Roadmap */}
                            <div className="space-y-3">
                                {roadmapData.subjects.map((subject, subjectIdx) => {
                                    const isSelected = selectedSubjects.has(subjectIdx);
                                    const isCovered = subjectIdx < coveredSubjects.length;
                                    const isNext = subjectIdx === nextSubjectIndex;
                                    
                                    return (
                                        <motion.div
                                            key={subjectIdx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: subjectIdx * 0.05 }}
                                        >
                                            {/* Compact Subject Card - Clickable */}
                                            <div 
                                                className={`bg-white rounded-lg shadow-md border-2 transition-all cursor-pointer hover:shadow-lg ${
                                                    isSelected || isCovered
                                                        ? 'border-emerald-300 bg-emerald-50/30' 
                                                        : isNext 
                                                            ? 'border-blue-300 bg-blue-50/30' 
                                                            : 'border-gray-200 hover:border-blue-200'
                                                }`}
                                                onClick={() => toggleSubject(subjectIdx)}
                                            >
                                                {/* Compact Subject Header */}
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className={`w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center text-white font-bold text-sm transition-all ${
                                                                isSelected || isCovered
                                                                    ? 'bg-emerald-500' 
                                                                    : isNext 
                                                                        ? 'bg-blue-500 animate-pulse' 
                                                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                                            }`}>
                                                                {isSelected && <span className="text-xs">✓</span>}
                                                                {!isSelected && <span>{subjectIdx + 1}</span>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-sm font-bold text-gray-800 truncate">
                                                                    {subject.name}
                                                                </h3>
                                                                <p className="text-xs text-gray-600 mt-0.5">
                                                                    {subject.question_count} questions
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-gray-800">
                                                                    {subject.weightage}%
                                                                </div>
                                                                <div className="text-xs text-gray-500">Weight</div>
                                                            </div>
                                                            <div
                                                                className={`w-3 h-3 rounded-full ${getWeightageColor(
                                                                    subject.weightage
                                                                )}`}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Compact Topics List */}
                                                {subject.topics && subject.topics.length > 0 && (
                                                    <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                                                        <div className="flex flex-wrap gap-2">
                                                            {subject.topics.slice(0, 6).map((topic, topicIdx) => (
                                                                <div
                                                                    key={topicIdx}
                                                                    className="bg-gray-50 rounded-md px-2 py-1 border border-gray-200 text-xs"
                                                                >
                                                                    <span className="text-gray-700 font-medium">
                                                                        {topic.name.length > 40 
                                                                            ? topic.name.substring(0, 40) + '...' 
                                                                            : topic.name}
                                                                    </span>
                                                                    <span className={`ml-2 px-1.5 py-0.5 text-xs font-bold text-white rounded ${getWeightageColor(
                                                                        topic.weightage
                                                                    )}`}>
                                                                        {topic.weightage}%
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {subject.topics.length > 6 && (
                                                                <div className="bg-gray-100 rounded-md px-2 py-1 text-xs text-gray-600">
                                                                    +{subject.topics.length - 6} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Prominent Arrow Connector */}
                                            {subjectIdx < roadmapData.subjects.length - 1 && (
                                                <div className="flex justify-center py-2">
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: subjectIdx * 0.05 + 0.2 }}
                                                        className="relative"
                                                    >
                                                        {/* Arrow with shadow */}
                                                        <svg
                                                            width="32"
                                                            height="32"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            className="text-blue-500 drop-shadow-sm"
                                                        >
                                                            <path
                                                                d="M12 4L12 20M12 20L6 14M12 20L18 14"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                        {/* Animated pulse effect */}
                                                        <motion.div
                                                            className="absolute inset-0 rounded-full bg-blue-400 opacity-20"
                                                            animate={{
                                                                scale: [1, 1.5, 1],
                                                                opacity: [0.2, 0, 0.2],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                ease: "easeInOut",
                                                            }}
                                                        />
                                                    </motion.div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Sticky Interactive Progress Ruler */}
            {roadmapData && !loading && !error && (
                <div 
                    className={`fixed bottom-0 bg-white border-t border-gray-200 shadow-lg z-40 transition-all duration-300 ${
                        primarySidebarCollapsed ? 'left-16' : 'left-64'
                    } right-0`}
                >
                    <div className="max-w-7xl mx-auto p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-semibold text-gray-800">
                                    Simulate Your Progress
                                </h3>
                                <button
                                    onClick={handleReset}
                                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                    title="Reset to 0%"
                                >
                                    Reset
                                </button>
                            </div>
                            <div className="text-sm font-bold text-blue-600">
                                {simulatedProgress.toFixed(1)}%
                            </div>
                        </div>
                        <div
                            ref={progressBarRef}
                            className="relative h-10 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
                            onClick={handleProgressClick}
                            onMouseDown={handleMouseDown}
                        >
                            {/* Progress Fill */}
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${simulatedProgress}%` }}
                                transition={{ duration: 0.1 }}
                            />
                            
                            {/* Draggable Handle - Vertical Bar Design */}
                            <motion.div
                                className="absolute top-0 h-full w-1 bg-white shadow-lg cursor-grab active:cursor-grabbing z-10"
                                style={{ left: `${simulatedProgress}%`, marginLeft: '-2px' }}
                                animate={{ x: 0 }}
                                whileHover={{ scaleX: 1.5 }}
                                whileTap={{ scaleX: 1.2 }}
                            >
                                {/* Handle indicator dot */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
                            </motion.div>
                            
                            {/* Dynamic Milestone Markers based on Subject Weightage */}
                            {dynamicMilestones.map((milestone, idx) => (
                                <div
                                    key={idx}
                                    className="absolute top-0 h-full flex flex-col items-center pointer-events-none group"
                                    style={{ left: `${milestone.percentage}%`, marginLeft: '-1px' }}
                                >
                                    {/* Marker Line */}
                                    <div className="w-0.5 h-full bg-blue-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    {/* Marker Label - Shows on hover */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                            <div className="font-semibold">{milestone.percentage.toFixed(1)}%</div>
                                            <div className="text-[10px] text-gray-300 mt-0.5 max-w-[120px] truncate">
                                                {milestone.subjectName}
                                            </div>
                                        </div>
                                        {/* Tooltip arrow */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
                                            <div className="border-4 border-transparent border-b-gray-800"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Always visible percentage */}
                                    <div className="absolute -bottom-5 text-[10px] text-gray-500 whitespace-nowrap font-medium">
                                        {milestone.percentage.toFixed(0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Dynamic Progress Info */}
                        {simulatedProgress > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 pt-3 border-t border-gray-200"
                            >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="text-xs text-gray-600">
                                        {coveredSubjects.length > 0 ? (
                                            <>
                                                <span className="font-semibold text-gray-800">
                                                    {coveredSubjects.length} subject{coveredSubjects.length !== 1 ? 's' : ''} covered
                                                </span>
                                                {nextSubjectIndex < roadmapData.subjects.length && (
                                                    <> • Next: <span className="font-medium">{roadmapData.subjects[nextSubjectIndex]?.name}</span></>
                                                )}
                                            </>
                                        ) : (
                                            <>Start with: <span className="font-medium">{roadmapData.subjects[0]?.name}</span></>
                                        )}
                                    </div>
                                    
                                    {/* Next Milestone Indicator */}
                                    {(() => {
                                        const nextMilestone = dynamicMilestones.find(m => m.percentage > simulatedProgress);
                                        if (nextMilestone) {
                                            const remaining = (nextMilestone.percentage - simulatedProgress).toFixed(1);
                                            return (
                                                <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                                    Next milestone: {nextMilestone.percentage.toFixed(1)}% ({remaining}% away)
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
