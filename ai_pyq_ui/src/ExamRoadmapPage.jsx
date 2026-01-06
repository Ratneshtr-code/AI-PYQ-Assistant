// src/ExamRoadmapPage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import { useLanguage } from "./contexts/LanguageContext";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ExamRoadmapPage() {
    const { examName } = useParams();
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [roadmapData, setRoadmapData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState(new Set());
    const [showCelebration, setShowCelebration] = useState(false);
    const [prevProgress, setPrevProgress] = useState(0);
    const progressBarRef = useRef(null);
    
    const decodedExamName = examName ? decodeURIComponent(examName) : "";

    useEffect(() => {
        // Fetch exam filters
        const fetchExams = async () => {
            try {
                const res = await fetch(buildApiUrl("filters"));
                const data = await res.json();
                setExamsList(data.exams || []);
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            }
        };
        fetchExams();
    }, []);

    useEffect(() => {
        if (!decodedExamName) {
            setRoadmapData(null);
            return;
        }

        const fetchRoadmap = async () => {
            setLoading(true);
            setError(null);
            try {
                const langParam = language === "hi" ? "hi" : "en";
                const res = await fetch(
                    `${buildApiUrl("roadmap/generate")}?exam=${encodeURIComponent(decodedExamName)}&language=${langParam}`
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
    }, [decodedExamName, language]);

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
    const updateProgress = (clientY) => {
        if (!progressBarRef.current) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickY = clientY - rect.top;
        const percentage = Math.max(0, Math.min(100, 100 - (clickY / rect.height) * 100));
        setSimulatedProgress(percentage);
        
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
        updateProgress(e.clientY);
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        updateProgress(e.clientY);
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

    const handleTopicClick = (e, subject, topic) => {
        e.stopPropagation();
        const subjectName = subject.name_en || subject.name;
        const topicName = topic.name_en || topic.name;
        navigate(`/topic-wise-pyq?exam=${encodeURIComponent(decodedExamName)}&subject=${encodeURIComponent(subjectName)}&topic=${encodeURIComponent(topicName)}&from=exam-roadmap`);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            updateProgress(e.clientY);
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
                exam={decodedExamName}
                setExam={() => {}}
                examsList={examsList}
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* Main Content */}
            <div
                className={`flex-1 transition-all duration-300 ${
                    primarySidebarCollapsed ? "md:ml-16" : "md:ml-64"
                }`}
            >
                {/* Vertical Progress Simulator - Fixed Position */}
                {roadmapData && !loading && !error && (
                    <div 
                        className={`hidden md:flex fixed z-30 flex-col items-center py-6 px-3 transition-all duration-300 ${
                            primarySidebarCollapsed ? 'left-20' : 'left-72'
                        }`}
                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                        <div className="mb-2 text-sm font-bold text-blue-600">
                            {simulatedProgress.toFixed(0)}%
                        </div>
                        
                        <div
                            ref={progressBarRef}
                            className="relative w-5 h-[500px] bg-gray-100 rounded-full cursor-pointer overflow-hidden border border-gray-200/50"
                            onClick={handleProgressClick}
                            onMouseDown={handleMouseDown}
                        >
                            <motion.div
                                className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 via-purple-500 to-pink-500 rounded-full"
                                initial={{ height: 0 }}
                                animate={{ height: `${simulatedProgress}%` }}
                                transition={{ duration: 0.1 }}
                            />
                            
                            <motion.div
                                className="absolute left-0 w-full h-1.5 bg-white shadow-lg cursor-grab active:cursor-grabbing z-10 rounded-full"
                                style={{ bottom: `${simulatedProgress}%`, marginBottom: '-3px' }}
                                animate={{ y: 0 }}
                                whileHover={{ scaleY: 1.8 }}
                                whileTap={{ scaleY: 1.3 }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-2 border-white shadow-md"></div>
                            </motion.div>
                            
                            {dynamicMilestones.map((milestone, idx) => (
                                <div
                                    key={idx}
                                    className="absolute left-0 w-full flex items-center pointer-events-none group"
                                    style={{ bottom: `${milestone.percentage}%`, marginBottom: '-0.5px' }}
                                >
                                    <div className="h-0.5 w-full bg-blue-400 opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            ))}
                        </div>
                        
                        <button
                            onClick={handleReset}
                            className="mt-2 px-2.5 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            title="Reset to 0%"
                        >
                            ↻
                        </button>
                    </div>
                )}
                
                <div className={`p-4 md:p-6 max-w-7xl mx-auto ${roadmapData && !loading && !error ? 'md:ml-24' : ''} pb-6`}>
                    {/* Header with Back Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 flex items-start justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/home/${encodeURIComponent(decodedExamName)}`)}
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shadow-sm"
                                title="Back to Exam Page"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                    {decodedExamName} {language === "hi" ? "रोडमैप" : "RoadMap"}
                                </h1>
                                <p className="text-xs md:text-sm text-gray-600">
                                    {language === "hi"
                                        ? "अपनी तैयारी के लिए रणनीति देखें"
                                        : "View strategy for your preparation"}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                <p className="text-gray-600 text-sm">
                                    {language === "hi" ? "रोडमैप जेनरेट हो रहा है..." : "Generating roadmap..."}
                                </p>
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
                    {!decodedExamName && !loading && !error && (
                        <motion.div
                            key="strategy-empty"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200"
                        >
                            <div className="text-5xl mb-3">🎯</div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                {language === "hi" ? "रोडमैप उपलब्ध नहीं है" : "Roadmap not available"}
                            </h3>
                        </motion.div>
                    )}

                    {/* Roadmap Strategy Content */}
                    {roadmapData && !loading && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                        >
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
                                            <div 
                                                className={`bg-white rounded-lg shadow-md border-2 transition-all cursor-pointer hover:shadow-lg ${
                                                    isSelected
                                                        ? 'border-emerald-300 bg-emerald-50/30' 
                                                        : isNext 
                                                            ? 'border-blue-300 bg-blue-50/30' 
                                                            : 'border-gray-200 hover:border-blue-200'
                                                }`}
                                                onClick={() => toggleSubject(subjectIdx)}
                                            >
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <div className={`w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center text-white font-bold text-sm transition-all ${
                                                                isSelected
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

                                                {subject.topics && subject.topics.length > 0 && (
                                                    <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                                                        <div className="flex flex-wrap gap-2">
                                                            {subject.topics.slice(0, 6).map((topic, topicIdx) => (
                                                                <div
                                                                    key={topicIdx}
                                                                    onClick={(e) => handleTopicClick(e, subject, topic)}
                                                                    className="bg-gray-50 rounded-md px-2 py-1 border border-gray-200 text-xs cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
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

                                            {subjectIdx < roadmapData.subjects.length - 1 && (
                                                <div className="flex justify-center py-3">
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: subjectIdx * 0.05 + 0.2 }}
                                                        className="relative"
                                                    >
                                                        <svg
                                                            width="20"
                                                            height="20"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            className="text-blue-400 drop-shadow-sm"
                                                        >
                                                            <path
                                                                d="M12 4L12 20M12 20L6 14M12 20L18 14"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
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
        </div>
    );
}

