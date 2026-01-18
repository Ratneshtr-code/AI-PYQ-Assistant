// src/ConceptMapPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { buildApiUrl } from "./config/apiConfig";
import SubjectSelector from "./components/conceptmap/SubjectSelector";
import TopicList from "./components/conceptmap/TopicList";
import ContentRenderer from "./components/conceptmap/ContentRenderer";
import LearningPath from "./components/conceptmap/LearningPath";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ConceptMapPage() {
    const isMobile = useMobileDetection();
    const navigate = useNavigate();
    const location = useLocation();
    const { subjectId, topicId } = useParams();
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [organizedTopics, setOrganizedTopics] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [roadmapExists, setRoadmapExists] = useState(true);
    const [checkingRoadmap, setCheckingRoadmap] = useState(false);
    const [roadmap, setRoadmap] = useState(null);

    // Check if we're on a learning-path route
    const isLearningPathRoute = location.pathname.includes('/learning-path');
    const currentSubjectId = subjectId || selectedSubject;

    // Check if roadmap exists for the subject
    useEffect(() => {
        if (isLearningPathRoute && currentSubjectId) {
            setCheckingRoadmap(true);
            const checkRoadmap = async () => {
                try {
                    const url = buildApiUrl(`conceptmap/roadmap/${currentSubjectId}`);
                    const res = await fetch(url, {
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                    });
                    setRoadmapExists(res.ok);
                } catch (err) {
                    console.error("Error checking roadmap:", err);
                    setRoadmapExists(false);
                } finally {
                    setCheckingRoadmap(false);
                }
            };
            checkRoadmap();
        }
    }, [isLearningPathRoute, currentSubjectId]);

    // Fetch subjects on mount
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
                    return;
                }

                const data = await res.json();
                setSubjects(data.subjects || []);
            } catch (err) {
                console.error("Error fetching subjects:", err);
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, []);

    // Auto-select subject from URL or default to Geography
    useEffect(() => {
        if (subjects.length > 0 && !selectedSubject) {
            if (subjectId) {
                // Use subject from URL
                const subject = subjects.find(sub => sub.id === subjectId);
                if (subject) {
                    setSelectedSubject(subject.id);
                }
            } else {
                // Default to Geography
                const geographySubject = subjects.find(
                    sub => sub.id?.toLowerCase() === 'geography' || sub.name?.toLowerCase() === 'geography'
                );
                if (geographySubject) {
                    setSelectedSubject(geographySubject.id);
                }
            }
        }
    }, [subjects, selectedSubject, subjectId]);

    // Fetch roadmap and topics when subject is selected
    useEffect(() => {
        if (!selectedSubject) {
            setTopics([]);
            setOrganizedTopics([]);
            setSelectedTopic(null);
            setRoadmap(null);
            return;
        }

        const fetchRoadmapAndTopics = async () => {
            setLoadingTopics(true);
            try {
                // Fetch topics
                const topicsUrl = buildApiUrl(`conceptmap/topics/${selectedSubject}`);
                const topicsRes = await fetch(topicsUrl, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!topicsRes.ok) {
                    console.error("Failed to fetch topics");
                    setTopics([]);
                    setOrganizedTopics([]);
                    return;
                }

                const topicsData = await topicsRes.json();
                const allTopics = topicsData.topics || [];
                setTopics(allTopics);

                // Try to fetch roadmap to organize topics
                try {
                    const roadmapUrl = buildApiUrl(`conceptmap/roadmap/${selectedSubject}`);
                    const roadmapRes = await fetch(roadmapUrl, {
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
                    });

                    if (roadmapRes.ok) {
                        const roadmapData = await roadmapRes.json();
                        setRoadmap(roadmapData);

                        // Organize topics by roadmap chapters
                        if (roadmapData.topics && roadmapData.topics.length > 0) {
                            const organized = [];
                            
                            roadmapData.topics.forEach((chapter) => {
                                // Find topics that belong to this chapter
                                const chapterTopics = [];
                                
                                chapter.subTopics.forEach((subTopic) => {
                                    const topic = allTopics.find(t => t.id === subTopic.id);
                                    if (topic) {
                                        chapterTopics.push(topic);
                                    }
                                });

                                if (chapterTopics.length > 0) {
                                    organized.push({
                                        chapterTitle: chapter.mainTopic,
                                        chapterId: chapter.id,
                                        topics: chapterTopics
                                    });
                                }
                            });

                            // Add any remaining topics that weren't in the roadmap
                            const roadmapTopicIds = new Set(
                                roadmapData.topics.flatMap(ch => ch.subTopics.map(st => st.id))
                            );
                            const remainingTopics = allTopics.filter(t => !roadmapTopicIds.has(t.id));
                            
                            if (remainingTopics.length > 0) {
                                organized.push({
                                    chapterTitle: "Other Topics",
                                    chapterId: "other",
                                    topics: remainingTopics
                                });
                            }

                            setOrganizedTopics(organized);
                        } else {
                            // No roadmap structure, use flat list
                            setOrganizedTopics([{
                                chapterTitle: "All Topics",
                                chapterId: "all",
                                topics: allTopics
                            }]);
                        }
                    } else {
                        // No roadmap available, use flat list
                        setOrganizedTopics([{
                            chapterTitle: "All Topics",
                            chapterId: "all",
                            topics: allTopics
                        }]);
                    }
                } catch (roadmapErr) {
                    console.error("Error fetching roadmap:", roadmapErr);
                    // Use flat list if roadmap fetch fails
                    setOrganizedTopics([{
                        chapterTitle: "All Topics",
                        chapterId: "all",
                        topics: allTopics
                    }]);
                }
            } catch (err) {
                console.error("Error fetching topics:", err);
                setTopics([]);
                setOrganizedTopics([]);
            } finally {
                setLoadingTopics(false);
            }
        };

        fetchRoadmapAndTopics();
    }, [selectedSubject]);


    const handleSubjectSelect = (subjectId) => {
        setSelectedSubject(subjectId);
        setSelectedTopic(null);
    };

    const handleTopicSelect = async (topic) => {
        // Topic already has path from topics list, but fetch full details for consistency
        // If topic already has path, use it directly
        if (topic.path) {
            setSelectedTopic(topic);
            return;
        }

        // Otherwise fetch topic details to get path for static content
        try {
            const url = buildApiUrl(`conceptmap/topic/${topic.id}?subject=${selectedSubject}`);
            const res = await fetch(url, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            });

            if (!res.ok) {
                console.error("Failed to fetch topic details");
                setSelectedTopic(topic); // Fallback to basic topic info
                return;
            }

            const fullTopic = await res.json();
            setSelectedTopic(fullTopic);
        } catch (err) {
            console.error("Error fetching topic details:", err);
            setSelectedTopic(topic); // Fallback to basic topic info
        }
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

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Desktop Spacer for balance */}
                    <div className="hidden md:block w-[180px]"></div>
                </div>
            </div>

            {/* Mobile Sidebar Backdrop */}
            {mobileSidebarOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileSidebarOpen(false)}
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Slim Unified Sidebar */}
                <motion.aside
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ 
                        x: 0, 
                        opacity: 1,
                        ...(isMobile && {
                            x: mobileSidebarOpen ? 0 : -280
                        })
                    }}
                    transition={{ duration: 0.3 }}
                    className={`bg-white/95 backdrop-blur-sm border-r border-gray-200/50 shadow-xl flex flex-col transition-all duration-300 ${
                        sidebarCollapsed && !isMobile ? "w-16" : "w-[280px]"
                    } ${isMobile ? "fixed left-0 top-0 h-full z-50" : "flex-shrink-0"}`}
                >
                    {/* Mobile Close Button */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileSidebarOpen(false)}
                            className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-20"
                            aria-label="Close menu"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    {/* Desktop Collapse Toggle Button */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden md:flex absolute -right-3 top-4 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center hover:bg-gray-50 transition-colors z-20"
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Subjects Section */}
                    <div className="pt-12 md:pt-0 relative" style={{ zIndex: 10 }}>
                        {loadingSubjects ? (
                            <div className="h-full flex items-center justify-center p-4">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-600 text-sm">Loading subjects...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 relative">
                                {(!sidebarCollapsed || isMobile) && (
                                    <h2 className="text-sm font-semibold text-gray-700 mb-3 px-2 uppercase tracking-wide">
                                        Subjects
                                    </h2>
                                )}
                                <SubjectSelector
                                    subjects={subjects}
                                    selectedSubject={selectedSubject}
                                    onSelectSubject={(id) => {
                                        handleSubjectSelect(id);
                                        if (isMobile) setMobileSidebarOpen(false);
                                    }}
                                    isCollapsed={sidebarCollapsed && !isMobile}
                                />
                            </div>
                        )}
                    </div>

                    {/* Topics Section - Appears immediately below Subjects */}
                    <div className="flex-1 overflow-y-auto relative" style={{ zIndex: 1 }}>
                        {(!sidebarCollapsed || isMobile) && (
                            <div className="px-3 pt-2 pb-2">
                                <h2 className="text-sm font-semibold text-gray-700 mb-3 px-2 uppercase tracking-wide">
                                    Topics
                                </h2>
                            </div>
                        )}
                        <TopicList
                            topics={topics}
                            organizedTopics={organizedTopics}
                            selectedTopic={selectedTopic}
                            onSelectTopic={(topic) => {
                                handleTopicSelect(topic);
                                if (isMobile) setMobileSidebarOpen(false);
                            }}
                            loading={loadingTopics}
                            isCollapsed={sidebarCollapsed && !isMobile}
                        />
                    </div>
                </motion.aside>

                {/* Main Content Area - Full Width */}
                <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                    {/* Learning Path View - Only show if no topic is selected */}
                    {isLearningPathRoute && currentSubjectId && !selectedTopic ? (
                        checkingRoadmap ? (
                            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-600">Loading...</p>
                                </div>
                            </div>
                        ) : roadmapExists ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 min-h-0 rounded-lg overflow-hidden shadow-xl border border-gray-200/50 bg-white m-4">
                                    <LearningPath
                                        subject={currentSubjectId}
                                        onTopicSelect={handleTopicSelect}
                                        currentTopicId={topicId}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="text-center max-w-md"
                                >
                                    <div className="text-5xl md:text-7xl mb-4 md:mb-6">🗺️</div>
                                    <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2 md:mb-3">
                                        Coming Soon
                                    </h3>
                                    <p className="text-gray-500 text-sm md:text-lg">
                                        The learning path for this subject is being prepared. Please check back later.
                                    </p>
                                    <motion.button
                                        onClick={() => navigate("/conceptmap/subjects")}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                                    >
                                        Back to Subjects
                                    </motion.button>
                                </motion.div>
                            </div>
                        )
                    ) : selectedTopic ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            {/* Content Renderer - Full Height */}
                            <div className="flex-1 min-h-0 rounded-lg overflow-hidden shadow-xl border border-gray-200/50 bg-white m-4">
                                <ContentRenderer 
                                    topic={selectedTopic} 
                                    selectedSubject={selectedSubject}
                                    onTopicSelect={handleTopicSelect}
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-center max-w-md"
                            >
                                <div className="text-5xl md:text-7xl mb-4 md:mb-6 animate-pulse">🗺️</div>
                                <h3 className="text-xl md:text-2xl font-semibold text-gray-700 mb-2 md:mb-3">
                                    Select a Topic
                                </h3>
                                <p className="text-gray-500 text-sm md:text-lg">
                                    {isMobile ? "Tap the menu to get started" : "Choose a subject and topic to view the static content"}
                                </p>
                                {isMobile && (
                                    <button
                                        onClick={() => setMobileSidebarOpen(true)}
                                        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                                    >
                                        Open Menu
                                    </button>
                                )}
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

