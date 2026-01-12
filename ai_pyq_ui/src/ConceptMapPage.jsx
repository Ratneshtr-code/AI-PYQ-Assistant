// src/ConceptMapPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { buildApiUrl } from "./config/apiConfig";
import Sidebar from "./components/Sidebar";
import SubjectSelector from "./components/conceptmap/SubjectSelector";
import TopicList from "./components/conceptmap/TopicList";
import VisualRenderer from "./components/conceptmap/VisualRenderer";
import InfoPopup from "./components/conceptmap/InfoPopup";
import { useMobileDetection } from "./utils/useMobileDetection";

export default function ConceptMapPage() {
    const isMobile = useMobileDetection();
    const [examsList, setExamsList] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [popupData, setPopupData] = useState(null);
    const [popupPosition, setPopupPosition] = useState(null);
    const [primarySidebarCollapsed, setPrimarySidebarCollapsed] = useState(false);

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

        // Fetch exams list for sidebar
        const fetchExams = async () => {
            try {
                const url = buildApiUrl("filters");
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    setExamsList(data.exams || []);
                }
            } catch (err) {
                console.error("Error fetching exams:", err);
            }
        };

        fetchExams();
    }, []);

    // Fetch topics when subject is selected
    useEffect(() => {
        if (!selectedSubject) {
            setTopics([]);
            setSelectedTopic(null);
            return;
        }

        const fetchTopics = async () => {
            setLoadingTopics(true);
            try {
                const url = buildApiUrl(`conceptmap/topics/${selectedSubject}`);
                const res = await fetch(url, {
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                });

                if (!res.ok) {
                    console.error("Failed to fetch topics");
                    setTopics([]);
                    return;
                }

                const data = await res.json();
                setTopics(data.topics || []);
            } catch (err) {
                console.error("Error fetching topics:", err);
                setTopics([]);
            } finally {
                setLoadingTopics(false);
            }
        };

        fetchTopics();
    }, [selectedSubject]);

    const handleSubjectSelect = (subjectId) => {
        setSelectedSubject(subjectId);
        setSelectedTopic(null);
    };

    const handleTopicSelect = async (topic) => {
        // Fetch full topic details including data
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

    const handleElementClick = (data) => {
        setPopupData(data);
        // Center popup on screen
        setPopupPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    const handleClosePopup = () => {
        setPopupData(null);
        setPopupPosition(null);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            {/* Primary Sidebar */}
            <Sidebar
                exam={""}
                setExam={() => {}}
                examsList={examsList}
                onOpenSecondarySidebar={() => {}}
                onCollapseChange={(isCollapsed) => {
                    setPrimarySidebarCollapsed(isCollapsed);
                }}
            />

            {/* Main Content */}
            <main
                className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${
                    primarySidebarCollapsed ? "md:ml-16" : "md:ml-64"
                }`}
            >
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                            🗺️ ConceptMap
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            Visual-based learning platform for interactive concept exploration
                        </p>
                    </motion.div>
                </div>

                {/* Three-Panel Layout */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Left Panel - Subject Selector */}
                    <div className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
                        {loadingSubjects ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                    <p className="text-gray-600 text-sm">Loading subjects...</p>
                                </div>
                            </div>
                        ) : (
                            <SubjectSelector
                                subjects={subjects}
                                selectedSubject={selectedSubject}
                                onSelectSubject={handleSubjectSelect}
                            />
                        )}
                    </div>

                    {/* Middle Panel - Topic List */}
                    <div className="w-full md:w-80 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                        <TopicList
                            topics={topics}
                            selectedTopic={selectedTopic}
                            onSelectTopic={handleTopicSelect}
                            loading={loadingTopics}
                        />
                    </div>

                    {/* Right Panel - Visual Area */}
                    <div className="flex-1 bg-white p-4 md:p-8 overflow-auto">
                        {selectedTopic ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="h-full min-h-[600px]"
                            >
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                                        {selectedTopic.title}
                                    </h2>
                                    {selectedTopic.description && (
                                        <p className="text-sm text-gray-600">
                                            {selectedTopic.description}
                                        </p>
                                    )}
                                </div>
                                <div className="h-[calc(100%-80px)]">
                                    <VisualRenderer
                                        visualType={selectedTopic.visualType}
                                        topicData={selectedTopic.data}
                                        onElementClick={handleElementClick}
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">🗺️</div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                        Select a Topic
                                    </h3>
                                    <p className="text-gray-500">
                                        Choose a subject and topic to view the interactive visualization
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Info Popup */}
            <InfoPopup
                isOpen={!!popupData}
                onClose={handleClosePopup}
                data={popupData}
                position={popupPosition}
            />
        </div>
    );
}

